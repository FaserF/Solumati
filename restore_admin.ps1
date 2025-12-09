$path = "frontend/src/components/AdminPanel.jsx"
$content = Get-Content -Path $path
# Check if file seems corrupted (has indentation on line 45)
# Note: Get-Content returns an array of lines (0-indexed)
# Line 45 in file matches index 44 in array.

if ($content[44] -match "^\s{20}import") {
    Write-Host "Detected corrupted file. Restoring..."

    $clean = $content | Select-Object -Skip 44 | ForEach-Object { $_ -replace "^ {20}","" }

    $header = "import React, { useState, useEffect } from 'react';`n" +
              "import ChatWindow from './ChatWindow';`n" +
              "import { Shield, Settings, Users, Save, RefreshCw, AlertTriangle, Check, UserX, XCircle, ArrowLeft, Crown, UserMinus, UserPlus, Edit2, Activity, Eye, EyeOff, Server, Globe, Database, HardDrive, FileText, Ban, Github, Info, Beaker, Zap, Mail, Unlock, MessageSquare } from 'lucide-react';"

    $final = $header + "`n" + ($clean -join "`n")

    [System.IO.File]::WriteAllText($path, $final, [System.Text.Encoding]::UTF8)
    Write-Host "Restoration complete."
} else {
    Write-Host "File does not appear to match expected corruption pattern. Aborting."
    Write-Host "Line 45 content: " + $content[44]
}
