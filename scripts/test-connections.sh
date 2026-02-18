#!/bin/bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo "=== Test des connexions API ==="
echo ""

# PRTG (API v2, port 1616)
echo -n "PRTG... "
HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
  "${PRTG_BASE_URL}/api/v2/experimental/probes" \
  -H "Authorization: Bearer ${PRTG_API_KEY}")
[ "$HTTP" = "200" ] && echo -e "${GREEN}OK${NC}" || echo -e "${RED}FAIL ($HTTP)${NC}"

# vCenter
echo -n "vCenter... "
TOKEN=$(curl -sk -X POST "${VCENTER_BASE_URL}/api/session" \
  -u "${VCENTER_USERNAME}:${VCENTER_PASSWORD}" 2>/dev/null)
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo -e "${GREEN}OK${NC}"
  curl -sk -X DELETE "${VCENTER_BASE_URL}/api/session" \
    -H "vmware-api-session-id: $(echo $TOKEN | tr -d '"')" 2>/dev/null
else
  echo -e "${RED}FAIL${NC}"
fi

# Proxmox
echo -n "Proxmox... "
HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
  "${PROXMOX_BASE_URL}/api2/json/version" \
  -H "Authorization: PVEAPIToken=${PROXMOX_TOKEN_ID}=${PROXMOX_TOKEN_SECRET}")
[ "$HTTP" = "200" ] && echo -e "${GREEN}OK${NC}" || echo -e "${RED}FAIL ($HTTP)${NC}"

# Veeam
echo -n "Veeam... "
VTOKEN=$(curl -sk -X POST "${VEEAM_BASE_URL}/api/oauth2/token" \
  -H "x-api-version: 1.2-rev1" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&username=${VEEAM_USERNAME}&password=${VEEAM_PASSWORD}" \
  2>/dev/null | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
[ -n "$VTOKEN" ] && echo -e "${GREEN}OK${NC}" || echo -e "${RED}FAIL${NC}"

# GLPI
echo -n "GLPI... "
GSESSION=$(curl -sk "${GLPI_BASE_URL}/initSession" \
  -H "App-Token: ${GLPI_APP_TOKEN}" \
  -H "Authorization: user_token ${GLPI_USER_TOKEN}" \
  2>/dev/null | grep -o '"session_token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$GSESSION" ]; then
  echo -e "${GREEN}OK${NC}"
  curl -sk "${GLPI_BASE_URL}/killSession" \
    -H "App-Token: ${GLPI_APP_TOKEN}" -H "Session-Token: ${GSESSION}" 2>/dev/null
else
  echo -e "${RED}FAIL${NC}"
fi

# SecureTransport
echo -n "SecureTransport... "
HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
  "${ST_BASE_URL}/api/${ST_API_VERSION:-v2.0}/myself" \
  -u "${ST_USERNAME}:${ST_PASSWORD}")
[ "$HTTP" = "200" ] && echo -e "${GREEN}OK${NC}" || echo -e "${YELLOW}HTTP $HTTP${NC}"

echo ""
echo "=== Tests terminés ==="
