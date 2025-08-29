#!/bin/bash

echo "🔥 Deploying Firestore security rules for cron job access..."

# Deploy Firestore rules
firebase deploy --only firestore:rules

echo "✅ Firestore rules deployed successfully!"
echo "🔍 You can verify the rules in the Firebase Console:"
echo "   https://console.firebase.google.com/project/$(firebase use --current 2>/dev/null || echo 'YOUR_PROJECT_ID')/firestore/rules"