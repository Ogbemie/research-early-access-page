# Power Automate Setup Guide – REAP Community Ideas

This guide walks through creating the 3 Power Automate Premium flows that serve as the API layer between the GitHub Pages frontend and SharePoint Lists backend.

## Prerequisites

- Power Automate Premium license
- SharePoint Lists created (run `setup-sharepoint.ps1` first)
- Access to https://make.powerautomate.com

---

## Flow 1: GET Ideas

Returns all ideas from the SharePoint list as JSON.

### Steps

1. Go to **make.powerautomate.com** → **+ Create** → **Instant cloud flow** → **Skip**
2. Add trigger: **When an HTTP request is received** (Premium)
   - Method: `GET`
3. Add action: **Get items** (SharePoint)
   - Site Address: `https://microsoft.sharepoint.com/sites/YOUR-SITE`
   - List Name: `REAP Ideas`
   - Top Count: `500`
   - Order By: `VoteCount desc`
4. Add action: **Select** (Data Operations)
   - From: `value` (output of Get items)
   - Map:
     ```
     id        → @{items('Apply_to_each')?['ID']}
     title     → @{items('Apply_to_each')?['Title']}
     description → @{items('Apply_to_each')?['IdeaDescription']}
     model     → @{items('Apply_to_each')?['ModelCategory']}
     feedbackType → @{items('Apply_to_each')?['FeedbackType']}
     status    → @{items('Apply_to_each')?['IdeaStatus']}
     voteCount → @{items('Apply_to_each')?['VoteCount']}
     submittedBy → @{items('Apply_to_each')?['SubmittedBy']}
     submittedDate → @{items('Apply_to_each')?['SubmittedDate']}
     ```
5. Add action: **Response**
   - Status Code: `200`
   - Headers: `Content-Type: application/json`
   - Body: `@{body('Select')}`

### CORS Header

Add this to the Response headers to allow the GitHub Pages site to call it:
```
Access-Control-Allow-Origin: https://ogbemie.github.io
```

### Save & copy the HTTP trigger URL

After saving, expand the trigger → copy the **HTTP GET URL**. You'll paste this into the frontend config.

---

## Flow 2: POST Idea

Creates a new idea in the SharePoint list.

### Steps

1. Create new **Instant cloud flow** → **Skip**
2. Add trigger: **When an HTTP request is received** (Premium)
   - Method: `POST`
   - Request Body JSON Schema:
     ```json
     {
       "type": "object",
       "properties": {
         "title": { "type": "string" },
         "description": { "type": "string" },
         "model": { "type": "string" },
         "feedbackType": { "type": "string" },
         "submittedBy": { "type": "string" }
       },
       "required": ["title", "description", "model", "feedbackType"]
     }
     ```
3. Add action: **Create item** (SharePoint)
   - Site Address: your site
   - List Name: `REAP Ideas`
   - Field mapping:
     ```
     Title          → triggerBody()?['title']
     IdeaDescription → triggerBody()?['description']
     ModelCategory  → triggerBody()?['model']
     FeedbackType   → triggerBody()?['feedbackType']
     IdeaStatus     → "NEW"
     VoteCount      → 0
     SubmittedBy    → triggerBody()?['submittedBy']
     SubmittedDate  → utcNow()
     ```
4. Add action: **Response**
   - Status Code: `201`
   - Headers: `Access-Control-Allow-Origin: https://ogbemie.github.io`
   - Body:
     ```json
     {
       "status": "created",
       "id": "@{body('Create_item')?['ID']}"
     }
     ```

### Optional: Teams Notification

5. Add action: **Post message in a chat or channel** (Teams)
   - Team: your REAP team
   - Channel: your ideas channel
   - Message:
     ```
     🆕 New REAP Idea: @{triggerBody()?['title']}
     Model: @{triggerBody()?['model']}
     Type: @{triggerBody()?['feedbackType']}
     By: @{triggerBody()?['submittedBy']}
     ```

---

## Flow 3: POST Vote

Records a vote, checking for duplicate fingerprints.

### Steps

1. Create new **Instant cloud flow** → **Skip**
2. Add trigger: **When an HTTP request is received** (Premium)
   - Method: `POST`
   - Request Body JSON Schema:
     ```json
     {
       "type": "object",
       "properties": {
         "ideaId": { "type": "integer" },
         "fingerprint": { "type": "string" }
       },
       "required": ["ideaId", "fingerprint"]
     }
     ```

3. Add action: **Get items** (SharePoint) – Check for existing vote
   - Site Address: your site
   - List Name: `REAP Votes`
   - Filter Query: `IdeaID eq @{triggerBody()?['ideaId']} and Fingerprint eq '@{triggerBody()?['fingerprint']}'`
   - Top Count: `1`

4. Add **Condition**: `length(body('Get_items')?['value'])` is greater than `0`

   **If yes** (duplicate):
   - Add action: **Response**
     - Status Code: `200`
     - Headers: `Access-Control-Allow-Origin: https://ogbemie.github.io`
     - Body: `{ "status": "already_voted" }`

   **If no** (new vote):

   5a. Add action: **Create item** (SharePoint) – Record vote
   - Site Address: your site
   - List Name: `REAP Votes`
   - Field mapping:
     ```
     Title       → "Vote"
     IdeaID      → triggerBody()?['ideaId']
     Fingerprint → triggerBody()?['fingerprint']
     VotedDate   → utcNow()
     ```

   5b. Add action: **Get item** (SharePoint) – Get current idea
   - Site Address: your site
   - List Name: `REAP Ideas`
   - Id: `triggerBody()?['ideaId']`

   5c. Add action: **Update item** (SharePoint) – Increment vote count
   - Site Address: your site
   - List Name: `REAP Ideas`
   - Id: `triggerBody()?['ideaId']`
   - VoteCount: `add(body('Get_item')?['VoteCount'], 1)`

   5d. Add action: **Response**
   - Status Code: `200`
   - Headers: `Access-Control-Allow-Origin: https://ogbemie.github.io`
   - Body:
     ```json
     {
       "status": "voted",
       "newCount": @{add(body('Get_item')?['VoteCount'], 1)}
     }
     ```

---

## Wiring Up the Frontend

Once all 3 flows are saved and you have the HTTP trigger URLs, update the config in `js/app.js`:

```javascript
const Config = {
    API_BASE: null,
    ENDPOINTS: {
        GET_IDEAS: 'https://prod-xx.westus.logic.azure.com:443/workflows/YOUR-GET-FLOW-URL',
        POST_IDEA: 'https://prod-xx.westus.logic.azure.com:443/workflows/YOUR-POST-IDEA-URL',
        POST_VOTE: 'https://prod-xx.westus.logic.azure.com:443/workflows/YOUR-POST-VOTE-URL'
    },
    STORAGE_KEYS: {
        IDEAS: 'reap_ideas',
        VOTES: 'reap_votes'
    }
};
```

Commit and push the change. The site will start using live SharePoint data.

---

## CORS Handling

Power Automate HTTP triggers don't natively support CORS preflight (OPTIONS) requests.
If you run into CORS issues, you have two options:

### Option A: Azure API Management (recommended for production)
Put an APIM gateway in front of the Power Automate flows to handle CORS.

### Option B: CORS Proxy via Azure Functions (lightweight)
Create a small Azure Function that proxies requests and adds CORS headers.

### Option C: Direct fetch with no-cors (simplest, limited)
Use `mode: 'no-cors'` in fetch calls — but you won't be able to read response bodies.

**Recommended**: Start with direct calls. If CORS blocks you, wrap the Power Automate URLs
in a simple Azure Function proxy.

---

## Testing

1. Open https://ogbemie.github.io/research-early-access-page/community.html
2. Submit an idea → verify it appears in the SharePoint "REAP Ideas" list
3. Vote on an idea → verify VoteCount increments and a record appears in "REAP Votes"
4. Vote again → verify "already_voted" response and no duplicate in Votes list
5. Refresh page → verify ideas load from SharePoint
