#!/bin/bash

ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU0NzEyMDAwLCJleHAiOjE5MTI0Nzg0MDB9.B1Wan9s9rxgFjvay8FUqILU8R2xBLpsvOdosYTx0s_Q'

echo "=============================================="
echo "TEST 1: SIGNUP RATE LIMITING (5/hour per email)"
echo "=============================================="
echo "Attempting 6 signup requests with: ratelimit-test@example.com"
echo ""

for i in {1..6}; do
  echo "Request $i:"
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST http://localhost:8000/auth/v1/signup \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email":"ratelimit-test@example.com","password":"TestPassword123!"}')

  http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
  body=$(echo "$response" | grep -v "HTTP_CODE:")

  echo "  Status: $http_code"
  if [ "$http_code" = "429" ]; then
    echo "  ✅ RATE LIMITED!"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    msg=$(echo "$body" | jq -r '.msg // .message // .error // "Processed"' 2>/dev/null || echo "Response received")
    echo "  Response: $msg"
  fi
  echo ""
  sleep 0.5
done

echo ""
echo "=============================================="
echo "TEST 2: LOGIN RATE LIMITING (10/hour per email)"
echo "=============================================="
echo "Attempting 12 login requests with: login-test@example.com"
echo ""

for i in {1..12}; do
  echo "Request $i:"
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST http://localhost:8000/auth/v1/token?grant_type=password \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email":"login-test@example.com","password":"WrongPassword123"}')

  http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
  body=$(echo "$response" | grep -v "HTTP_CODE:")

  echo "  Status: $http_code"
  if [ "$http_code" = "429" ]; then
    echo "  ✅ RATE LIMITED!"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    msg=$(echo "$body" | jq -r '.msg // .message // .error // "Processed"' 2>/dev/null || echo "Response received")
    echo "  Response: $msg"
  fi
  echo ""
  sleep 0.5
done

echo ""
echo "=============================================="
echo "TEST 3: OTP VERIFY RATE LIMITING (10/hour per email)"
echo "=============================================="
echo "Attempting 12 OTP verification requests with: otp-test@example.com"
echo ""

for i in {1..12}; do
  echo "Request $i:"
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST http://localhost:8000/functions/v1/verify-otp-securely \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"req_type":"email","email":"otp-test@example.com","token":"123456","captchaToken":"fake-token"}')

  http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
  body=$(echo "$response" | grep -v "HTTP_CODE:")

  echo "  Status: $http_code"
  if [ "$http_code" = "429" ]; then
    echo "  ✅ RATE LIMITED!"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    msg=$(echo "$body" | jq -r '.msg // .message // .error // "Processed"' 2>/dev/null || echo "Response received")
    echo "  Response: $msg"
  fi
  echo ""
  sleep 0.5
done

echo ""
echo "=============================================="
echo "RATE LIMIT DATABASE VERIFICATION"
echo "=============================================="
docker exec -i supabase-db psql -U supabase_admin -d postgres << 'EOF'
SELECT
  identifier_type,
  substring(identifier, 1, 30) as identifier,
  endpoint,
  requests_hour as count,
  reset_at_hour
FROM rate_limits
WHERE identifier IN ('ratelimit-test@example.com', 'login-test@example.com', 'otp-test@example.com')
ORDER BY updated_at DESC;
EOF
