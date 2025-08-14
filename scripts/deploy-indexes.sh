#!/bin/bash

echo "🚀 Deploying Firestore Indexes..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "   firebase login"
    exit 1
fi

echo "📋 Current Firestore indexes configuration:"
cat firestore.indexes.json | jq '.indexes[] | {collection: .collectionGroup, fields: [.fields[] | .fieldPath]}'

echo ""
echo "🔄 Deploying indexes to Firebase..."

# Deploy indexes
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Indexes deployed successfully!"
    echo ""
    echo "⏳ Note: Indexes may take a few minutes to build."
    echo "   You can monitor progress in the Firebase Console:"
    echo "   https://console.firebase.google.com/project/$(firebase use --current)/firestore/indexes"
    echo ""
    echo "🔄 The application will automatically fall back to localStorage"
    echo "   until the indexes are ready."
else
    echo ""
    echo "❌ Index deployment failed. Please check your Firebase configuration."
    exit 1
fi