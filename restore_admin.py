
import os

filepath = 'frontend/src/components/AdminPanel.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start of the original content
start_index = 0
for i, line in enumerate(lines):
    if "import {API_URL" in line and "config" in line:
        start_index = i
        break

if start_index == 0:
    print("Could not find start index, aborting to avoid damage.")
    exit(1)

new_lines = []
new_lines.append("import React, { useState, useEffect } from 'react';\n")
new_lines.append("import ChatWindow from './ChatWindow';\n")
new_lines.append("import { Shield, Settings, Users, Save, RefreshCw, AlertTriangle, Check, UserX, XCircle, ArrowLeft, Crown, UserMinus, UserPlus, Edit2, Activity, Eye, EyeOff, Server, Globe, Database, HardDrive, FileText, Ban, Github, Info, Beaker, Zap, Mail, Unlock, MessageSquare } from 'lucide-react';\n")

for line in lines[start_index:]:
    if line.startswith("                    "):
        new_lines.append(line[20:])
    else:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File restored successfully.")
