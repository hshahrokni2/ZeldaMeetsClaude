#!/bin/bash

# Quick push script for ZeldaMeetsClaude repository
# Run after creating repository on GitHub web interface

echo "🚀 ZeldaMeetsClaude - Quick Push Script"
echo ""
echo "First, create the repository on GitHub:"
echo "1. Go to: https://github.com/new"
echo "2. Repository name: ZeldaMeetsClaude"
echo "3. Description: Autonomous ground truth generation for Swedish BRF annual reports using 19-agent consensus system"
echo "4. Public visibility"
echo "5. DO NOT initialize with README"
echo "6. Click 'Create repository'"
echo ""
read -p "Have you created the repository? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Please create the repository first, then run this script again."
    exit 1
fi

echo ""
echo "📡 Adding remote origin..."
git remote add origin https://github.com/komilion/ZeldaMeetsClaude.git

echo "✅ Remote added"
echo ""
echo "📤 Pushing to GitHub (this may take a few minutes - 282 MB of PDFs)..."
git push -u origin main

echo ""
echo "✅ Push complete!"
echo ""
echo "🌐 Repository URL:"
echo "https://github.com/komilion/ZeldaMeetsClaude"
echo ""
echo "📊 Next steps:"
echo "1. Verify all 62 PDFs are uploaded"
echo "2. Check README.md is displayed"
echo "3. Repository is now 30% complete"
echo "4. Phase 2 (~4.5 hours) can be completed by Claude Web"
