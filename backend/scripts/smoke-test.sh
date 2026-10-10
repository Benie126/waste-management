#!/usr/bin/env bash
# End-to-end API smoke test for the WasteLink core workflow.
# Requires the backend running on http://localhost:4000
set -u
API="${API:-http://localhost:4000/api}"
PASS=0; FAIL=0

say()  { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$1"; }

# check <description> <expected-substring> <actual>
check() { case "$3" in *"$2"*) ok "$1";; *) bad "$1 (expected '$2', got: $(echo "$3" | head -c 220))";; esac; }

jget() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);const v=$1;console.log(v===undefined||v===null?'':typeof v==='object'?JSON.stringify(v):v)}catch(e){console.log('')}})"; }

login() { # email -> token
  curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | jget 'o.data&&o.data.token'
}

say "1. Health"
check "API health endpoint" '"status":"ok"' "$(curl -s "$API/health")"

say "2. Login (valid + invalid)"
ALICE=$(login alice@wastelink.rw 'Password123!')
CHRIS=$(login chris@wastelink.rw 'Password123!')
DIANA=$(login diana@wastelink.rw 'Password123!')
ADMIN=$(login admin@wastelink.rw 'Password123!')
[ -n "$ALICE" ] && ok "producer login returns token" || bad "producer login"
[ -n "$CHRIS" ] && ok "verified collector login returns token" || bad "collector login"
[ -n "$ADMIN" ] && ok "admin login returns token" || bad "admin login"
check "invalid password rejected" 'Invalid email or password' "$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"email":"alice@wastelink.rw","password":"wrong"}')"
check "validation error on short password" 'Validation failed' "$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"email":"nope","password":""}')"

say "3. RBAC / unauthorized access"
check "no token -> 401" 'Authentication token is missing' "$(curl -s "$API/listings/mine")"
check "COLLECTOR blocked from admin" 'not allowed to access' "$(curl -s "$API/admin/stats" -H "Authorization: Bearer $CHRIS")"
check "PRODUCER blocked from admin" 'not allowed to access' "$(curl -s "$API/admin/stats" -H "Authorization: Bearer $ALICE")"
check "COLLECTOR blocked from creating listing" 'not allowed to access' "$(curl -s -X POST "$API/listings" -H "Authorization: Bearer $CHRIS" -H 'Content-Type: application/json' -d '{"categoryId":1,"quantity":1,"location":"X"}')"
check "PRODUCER blocked from pickup request" 'not allowed to access' "$(curl -s -X POST "$API/pickups/requests" -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' -d '{"listingId":1}')"
# Reset Diana to PENDING so the unverified check is deterministic across runs.
curl -s -X PATCH "$API/admin/collectors/5/verify" -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"status":"PENDING"}' > /dev/null
check "unverified collector blocked from requesting" 'must be verified' "$(curl -s -X POST "$API/pickups/requests" -H "Authorization: Bearer $DIANA" -H 'Content-Type: application/json' -d '{"listingId":1}')"

say "4. Create waste listing (with matching)"
CREATE=$(curl -s -X POST "$API/listings" -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' \
  -d '{"categoryId":1,"quantity":12,"unit":"kg","location":"Kicukiro","description":"Smoke test plastic bales"}')
LISTING_ID=$(echo "$CREATE" | jget 'o.data&&o.data.listingId')
check "listing created as AVAILABLE" '"status":"AVAILABLE"' "$CREATE"
check "smart matching found Chris" '"collectorName":"Chris Collector"' "$CREATE"
[ -n "$LISTING_ID" ] && ok "listing id = $LISTING_ID" || bad "no listing id"
check "invalid category rejected" 'does not exist' "$(curl -s -X POST "$API/listings" -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' -d '{"categoryId":999,"quantity":5,"location":"Kicukiro"}')"

say "5. Edit listing"
check "listing updated" '"quantity":20' "$(curl -s -X PUT "$API/listings/$LISTING_ID" -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' -d '{"quantity":20}')"
check "other producer cannot edit" 'only edit your own' "$(curl -s -X PUT "$API/listings/$LISTING_ID" -H "Authorization: Bearer $(login bob@wastelink.rw 'Password123!')" -H 'Content-Type: application/json' -d '{"quantity":1}')"

say "6. Browse available waste (collector)"
check "collector sees available listings" '"categoryName":"Plastic"' "$(curl -s "$API/listings/available?search=Smoke" -H "Authorization: Bearer $CHRIS")"
check "collector recommendations" 'score' "$(curl -s "$API/collectors/recommendations" -H "Authorization: Bearer $CHRIS")"

say "7. Collector requests pickup"
REQ=$(curl -s -X POST "$API/pickups/requests" -H "Authorization: Bearer $CHRIS" -H 'Content-Type: application/json' \
  -d "{\"listingId\":$LISTING_ID,\"message\":\"I can collect tomorrow morning\"}")
REQ_ID=$(echo "$REQ" | jget 'o.data&&o.data.requestId')
check "request created as PENDING" '"status":"PENDING"' "$REQ"
check "duplicate request rejected" 'already requested' "$(curl -s -X POST "$API/pickups/requests" -H "Authorization: Bearer $CHRIS" -H 'Content-Type: application/json' -d "{\"listingId\":$LISTING_ID}")"
# Verify Diana so a second collector can compete for the same listing.
curl -s -X PATCH "$API/admin/collectors/5/verify" -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"status":"VERIFIED"}' > /dev/null
check "second collector may also request" '"success":true' "$(curl -s -X POST "$API/pickups/requests" -H "Authorization: Bearer $DIANA" -H 'Content-Type: application/json' -d "{\"listingId\":$LISTING_ID}")"
check "listing became REQUESTED" '"status":"REQUESTED"' "$(curl -s "$API/listings/$LISTING_ID" -H "Authorization: Bearer $ALICE")"
[ -n "$REQ_ID" ] && ok "request id = $REQ_ID" || bad "no request id"

say "8. Producer accepts request"
check "request accepted" '"status":"ACCEPTED"' "$(curl -s -X PATCH "$API/pickups/requests/$REQ_ID/accept" -H "Authorization: Bearer $ALICE")"
check "listing became SCHEDULED" '"status":"SCHEDULED"' "$(curl -s "$API/listings/$LISTING_ID" -H "Authorization: Bearer $ALICE")"
check "collector cannot accept (blocked by RBAC)" 'not allowed to access' "$(curl -s -X PATCH "$API/pickups/requests/$REQ_ID/accept" -H "Authorization: Bearer $CHRIS")"

say "9. Producer schedules pickup"
SCHED=$(curl -s -X POST "$API/pickups/requests/$REQ_ID/schedule" -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' \
  -d '{"scheduledDate":"2026-10-10T09:00:00.000Z","notes":"Front gate"}')
PICKUP_ID=$(echo "$SCHED" | jget 'o.data&&o.data.pickup&&o.data.pickup.pickupId')
check "pickup scheduled" '"status":"SCHEDULED"' "$SCHED"
[ -n "$PICKUP_ID" ] && ok "pickup id = $PICKUP_ID" || bad "no pickup id"
check "invalid transition rejected" 'Cannot change pickup status' "$(curl -s -X PATCH "$API/pickups/requests/$REQ_ID/status" -H "Authorization: Bearer $CHRIS" -H 'Content-Type: application/json' -d '{"status":"COMPLETED"}')"

say "10. Collection status update"
check "collector starts collection" '"status":"IN_PROGRESS"' "$(curl -s -X PATCH "$API/pickups/requests/$REQ_ID/status" -H "Authorization: Bearer $CHRIS" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}')"
check "collector completes collection" '"status":"COMPLETED"' "$(curl -s -X PATCH "$API/pickups/requests/$REQ_ID/status" -H "Authorization: Bearer $CHRIS" -H 'Content-Type: application/json' -d '{"status":"COMPLETED"}')"
check "listing became COLLECTED" '"status":"COLLECTED"' "$(curl -s "$API/listings/$LISTING_ID" -H "Authorization: Bearer $ALICE")"
check "producer history contains pickup" '"status":"COMPLETED"' "$(curl -s "$API/pickups/history" -H "Authorization: Bearer $ALICE")"
check "collector history contains pickup" '"status":"COMPLETED"' "$(curl -s "$API/pickups/history" -H "Authorization: Bearer $CHRIS")"

say "11. Feedback"
check "producer leaves feedback" '"rating":5' "$(curl -s -X POST "$API/pickups/feedback" -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' -d "{\"pickupId\":$PICKUP_ID,\"rating\":5,\"comment\":\"Very professional\"}")"
check "duplicate feedback rejected" 'already submitted' "$(curl -s -X POST "$API/pickups/feedback" -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' -d "{\"pickupId\":$PICKUP_ID,\"rating\":4}")"
check "collector cannot leave feedback" 'not allowed' "$(curl -s -X POST "$API/pickups/feedback" -H "Authorization: Bearer $CHRIS" -H 'Content-Type: application/json' -d "{\"pickupId\":$PICKUP_ID,\"rating\":1}")"

say "12. Admin: verification, stats, categories"
check "admin sees stats" '"byRole"' "$(curl -s "$API/admin/stats" -H "Authorization: Bearer $ADMIN")"
check "admin verifies Diana" '"verificationStatus":"VERIFIED"' "$(curl -s -X PATCH "$API/admin/collectors/5/verify" -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"status":"VERIFIED"}')"
D_LISTING=$(curl -s -X POST "$API/listings" -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' \
  -d '{"categoryId":4,"quantity":6,"unit":"kg","location":"Gasabo","description":"Smoke test glass for Diana"}' | jget 'o.data&&o.data.listingId')
check "verified Diana can now request" '"success":true' "$(curl -s -X POST "$API/pickups/requests" -H "Authorization: Bearer $DIANA" -H 'Content-Type: application/json' -d "{\"listingId\":$D_LISTING}")"
check "admin lists users" '"role":"ADMIN"' "$(curl -s "$API/admin/users" -H "Authorization: Bearer $ADMIN")"
check "admin lists activities" 'success' "$(curl -s "$API/admin/activities" -H "Authorization: Bearer $ADMIN")"
CAT=$(curl -s -X POST "$API/admin/categories" -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"categoryName":"SmokeTestCat","description":"temp"}')
CAT_ID=$(echo "$CAT" | jget 'o.data&&o.data.categoryId')
check "admin creates category" 'SmokeTestCat' "$CAT"
check "admin deletes category" '"success":true' "$(curl -s -X DELETE "$API/admin/categories/$CAT_ID" -H "Authorization: Bearer $ADMIN")"
check "duplicate category rejected" 'already exists' "$(curl -s -X POST "$API/admin/categories" -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"categoryName":"Plastic"}')"

say "13. Notifications + profile"
check "notifications endpoint" '"success":true' "$(curl -s "$API/notifications" -H "Authorization: Bearer $ALICE")"
check "profile update" '"phone":"+250700000000"' "$(curl -s -X PUT "$API/auth/profile" -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' -d '{"phone":"+250700000000"}')"
check "me endpoint" '"email":"alice@wastelink.rw"' "$(curl -s "$API/auth/me" -H "Authorization: Bearer $ALICE")"

say "14. Registration"
RND=$RANDOM
check "new producer registration" '"role":"WASTE_PRODUCER"' "$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"Test User\",\"email\":\"test$RND@wastelink.rw\",\"password\":\"Password123!\",\"role\":\"WASTE_PRODUCER\"}")"
check "duplicate email rejected" 'already exists' "$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' -d '{"name":"Alice Two","email":"alice@wastelink.rw","password":"Password123!","role":"WASTE_PRODUCER"}')"
check "admin self-registration blocked" 'role' "$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"Hacker\",\"email\":\"h$RND@wastelink.rw\",\"password\":\"Password123!\",\"role\":\"ADMIN\"}")"

printf '\n\033[1m=== RESULT: %d passed, %d failed ===\033[0m\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
