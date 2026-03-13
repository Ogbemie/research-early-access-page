# ============================================================
# REAP Community Ideas – SharePoint Lists Provisioning Script
# Run in PowerShell 7 (pwsh)
# ============================================================
#
# USAGE:
#   pwsh -File setup-sharepoint.ps1 -SiteUrl "https://microsoft.sharepoint.com/sites/YOUR-SITE"
#
# PREREQUISITES:
#   - PowerShell 7.2+
#   - PnP.PowerShell module: Install-Module PnP.PowerShell -Scope CurrentUser
#   - SharePoint site owner or admin permissions
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SiteUrl,

    [Parameter(Mandatory=$false)]
    [string]$ClientId = ""
)

# Install PnP.PowerShell if not present
if (-not (Get-Module -Name PnP.PowerShell -ListAvailable)) {
    Write-Host "Installing PnP.PowerShell module..." -ForegroundColor Yellow
    Install-Module -Name PnP.PowerShell -Scope CurrentUser -Force
}

Import-Module PnP.PowerShell

# Connect using device login (no app registration needed)
Write-Host "`nConnecting to SharePoint: $SiteUrl" -ForegroundColor Cyan
Write-Host "Using device login - follow the prompts..." -ForegroundColor Yellow
if ($ClientId) {
    Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId
} else {
    Connect-PnPOnline -Url $SiteUrl -DeviceLogin
}

Write-Host "`n✓ Connected successfully" -ForegroundColor Green

# ── Create REAP Ideas List ──────────────────────────────────
$ideasListName = "REAP Ideas"
Write-Host "`nCreating list: $ideasListName..." -ForegroundColor Cyan

$existingList = Get-PnPList -Identity $ideasListName -ErrorAction SilentlyContinue
if ($existingList) {
    Write-Host "  List '$ideasListName' already exists. Skipping creation." -ForegroundColor Yellow
} else {
    New-PnPList -Title $ideasListName -Template GenericList -EnableVersioning
    Write-Host "  ✓ List created" -ForegroundColor Green
}

# Add columns to REAP Ideas
Write-Host "  Adding columns..." -ForegroundColor Cyan

# Description (multi-line)
Add-PnPField -List $ideasListName -DisplayName "Description" -InternalName "IdeaDescription" -Type Note -ErrorAction SilentlyContinue
Write-Host "    ✓ Description"

# Model Category (choice)
Add-PnPField -List $ideasListName -DisplayName "Model" -InternalName "ModelCategory" -Type Choice -Choices "MMCTAgent","Paza" -ErrorAction SilentlyContinue
Write-Host "    ✓ Model"

# Feedback Type (choice)
Add-PnPField -List $ideasListName -DisplayName "FeedbackType" -InternalName "FeedbackType" -Type Choice -Choices "Feature Request","Bug Report","Question","Documentation" -ErrorAction SilentlyContinue
Write-Host "    ✓ FeedbackType"

# Status (choice)
Add-PnPField -List $ideasListName -DisplayName "Status" -InternalName "IdeaStatus" -Type Choice -Choices "NEW","UNDER REVIEW","IN PROGRESS","COMPLETED" -ErrorAction SilentlyContinue
Write-Host "    ✓ Status"

# Vote Count (number)
Add-PnPField -List $ideasListName -DisplayName "VoteCount" -InternalName "VoteCount" -Type Number -ErrorAction SilentlyContinue
# Set default value to 0
$voteField = Get-PnPField -List $ideasListName -Identity "VoteCount" -ErrorAction SilentlyContinue
if ($voteField) {
    $voteField.DefaultValue = "0"
    $voteField.Update()
    Invoke-PnPQuery
}
Write-Host "    ✓ VoteCount (default: 0)"

# Submitted By (single line)
Add-PnPField -List $ideasListName -DisplayName "SubmittedBy" -InternalName "SubmittedBy" -Type Text -ErrorAction SilentlyContinue
Write-Host "    ✓ SubmittedBy"

# Submitted Date (datetime)
Add-PnPField -List $ideasListName -DisplayName "SubmittedDate" -InternalName "SubmittedDate" -Type DateTime -ErrorAction SilentlyContinue
Write-Host "    ✓ SubmittedDate"

# Idea ID (auto-generated, use the built-in ID column)
Write-Host "    ✓ IdeaID (using built-in ID column)"

Write-Host "  ✓ All columns added to $ideasListName" -ForegroundColor Green

# ── Create REAP Votes List ──────────────────────────────────
$votesListName = "REAP Votes"
Write-Host "`nCreating list: $votesListName..." -ForegroundColor Cyan

$existingVotesList = Get-PnPList -Identity $votesListName -ErrorAction SilentlyContinue
if ($existingVotesList) {
    Write-Host "  List '$votesListName' already exists. Skipping creation." -ForegroundColor Yellow
} else {
    New-PnPList -Title $votesListName -Template GenericList -EnableVersioning
    Write-Host "  ✓ List created" -ForegroundColor Green
}

# Add columns to REAP Votes
Write-Host "  Adding columns..." -ForegroundColor Cyan

# Idea ID (number — references the ID from REAP Ideas)
Add-PnPField -List $votesListName -DisplayName "IdeaID" -InternalName "IdeaID" -Type Number -ErrorAction SilentlyContinue
Write-Host "    ✓ IdeaID"

# Fingerprint (single line text — SHA-256 hash)
Add-PnPField -List $votesListName -DisplayName "Fingerprint" -InternalName "Fingerprint" -Type Text -ErrorAction SilentlyContinue
Write-Host "    ✓ Fingerprint"

# Voted Date (datetime)
Add-PnPField -List $votesListName -DisplayName "VotedDate" -InternalName "VotedDate" -Type DateTime -ErrorAction SilentlyContinue
Write-Host "    ✓ VotedDate"

Write-Host "  ✓ All columns added to $votesListName" -ForegroundColor Green

# ── Create Views ────────────────────────────────────────────
Write-Host "`nCreating views for $ideasListName..." -ForegroundColor Cyan

$viewFields = @("ID", "Title", "IdeaDescription", "ModelCategory", "FeedbackType", "IdeaStatus", "VoteCount", "SubmittedBy", "SubmittedDate")

# All Ideas view
Add-PnPView -List $ideasListName -Title "All Ideas" -Fields $viewFields -SetAsDefault -ErrorAction SilentlyContinue
Write-Host "  ✓ All Ideas (default view)"

# By Model - MMCTAgent
Add-PnPView -List $ideasListName -Title "MMCTAgent Ideas" -Fields $viewFields -Query "<Where><Eq><FieldRef Name='ModelCategory'/><Value Type='Choice'>MMCTAgent</Value></Eq></Where><OrderBy><FieldRef Name='VoteCount' Ascending='FALSE'/></OrderBy>" -ErrorAction SilentlyContinue
Write-Host "  ✓ MMCTAgent Ideas view"

# By Model - Paza
Add-PnPView -List $ideasListName -Title "Paza Ideas" -Fields $viewFields -Query "<Where><Eq><FieldRef Name='ModelCategory'/><Value Type='Choice'>Paza</Value></Eq></Where><OrderBy><FieldRef Name='VoteCount' Ascending='FALSE'/></OrderBy>" -ErrorAction SilentlyContinue
Write-Host "  ✓ Paza Ideas view"

# Top Ideas (sorted by votes)
Add-PnPView -List $ideasListName -Title "Top Ideas" -Fields $viewFields -Query "<OrderBy><FieldRef Name='VoteCount' Ascending='FALSE'/></OrderBy>" -ErrorAction SilentlyContinue
Write-Host "  ✓ Top Ideas view"

# ── Add Seed Data ───────────────────────────────────────────
Write-Host "`nAdding seed ideas..." -ForegroundColor Cyan

$seedIdeas = @(
    @{
        Title = "Support for batch processing multiple videos simultaneously"
        IdeaDescription = "Currently MMCTAgent processes videos one at a time. It would be great to support batch ingestion and parallel reasoning across multiple video files, especially for large media libraries."
        ModelCategory = "MMCTAgent"
        FeedbackType = "Feature Request"
        IdeaStatus = "NEW"
        VoteCount = 24
        SubmittedBy = "Community Member"
        SubmittedDate = [DateTime]"2026-03-10T14:30:00Z"
    },
    @{
        Title = "Add Luganda and Amharic to Paza language support"
        IdeaDescription = "Paza currently supports 6 Kenyan languages. Expanding to include Luganda (Uganda) and Amharic (Ethiopia) would help reach more communities in East Africa."
        ModelCategory = "Paza"
        FeedbackType = "Feature Request"
        IdeaStatus = "UNDER REVIEW"
        VoteCount = 18
        SubmittedBy = "Language Researcher"
        SubmittedDate = [DateTime]"2026-03-08T09:15:00Z"
    },
    @{
        Title = "VideoAgent fails on videos longer than 4 hours"
        IdeaDescription = "When processing videos exceeding 4 hours in length, the VideoAgent times out during the ingestion phase. The key-frame extraction step appears to consume excessive memory."
        ModelCategory = "MMCTAgent"
        FeedbackType = "Bug Report"
        IdeaStatus = "NEW"
        VoteCount = 31
        SubmittedBy = "Enterprise User"
        SubmittedDate = [DateTime]"2026-03-12T16:45:00Z"
    },
    @{
        Title = "Improve Paza-Whisper accuracy for code-switched Swahili-English"
        IdeaDescription = "In real-world Kenyan conversations, speakers frequently switch between Swahili and English mid-sentence. The current Paza-Whisper model struggles with these transitions."
        ModelCategory = "Paza"
        FeedbackType = "Bug Report"
        IdeaStatus = "IN PROGRESS"
        VoteCount = 42
        SubmittedBy = "Digital Green Field Team"
        SubmittedDate = [DateTime]"2026-03-05T11:20:00Z"
    },
    @{
        Title = "Documentation for custom tool integration with ImageAgent"
        IdeaDescription = "The MMCTAgent blog mentions that developers can integrate domain-specific tools like medical image analyzers. However, there's no step-by-step guide or API documentation."
        ModelCategory = "MMCTAgent"
        FeedbackType = "Documentation"
        IdeaStatus = "NEW"
        VoteCount = 15
        SubmittedBy = "Developer"
        SubmittedDate = [DateTime]"2026-03-11T08:00:00Z"
    },
    @{
        Title = "How to fine-tune Paza models on our own language data?"
        IdeaDescription = "We have a small dataset (~50 hours) of transcribed audio in a local Nigerian language. Is there a recommended pipeline or playbook for fine-tuning a Paza model on custom data?"
        ModelCategory = "Paza"
        FeedbackType = "Question"
        IdeaStatus = "NEW"
        VoteCount = 27
        SubmittedBy = "NLP Researcher, Nigeria"
        SubmittedDate = [DateTime]"2026-03-09T13:10:00Z"
    }
)

foreach ($idea in $seedIdeas) {
    Add-PnPListItem -List $ideasListName -Values $idea -ErrorAction SilentlyContinue | Out-Null
    Write-Host "  ✓ $($idea.Title)" -ForegroundColor Gray
}

Write-Host "`n✓ Seed data added" -ForegroundColor Green

# ── Summary ─────────────────────────────────────────────────
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  REAP Community Ideas – Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "`n  SharePoint Site: $SiteUrl"
Write-Host "  Ideas List:     $ideasListName ($((@(Get-PnPListItem -List $ideasListName)).Count) items)"
Write-Host "  Votes List:     $votesListName"
Write-Host "`n  Next step: Create Power Automate flows"
Write-Host "  See: power-automate-setup.md for instructions"
Write-Host ""

Disconnect-PnPOnline
