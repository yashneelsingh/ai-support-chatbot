# Running the AI Support Chatbot Locally

This guide covers how to run the full stack (React + Node.js + MongoDB + PostgreSQL) on your local machine from scratch.

## Prerequisites

1. **Node.js**: v18 or newer
2. **Google Gemini API Key**: Get one from [Google AI Studio](https://aistudio.google.com/app/apikey)
3. **MongoDB Atlas Account**: Free tier works perfectly
4. **PostgreSQL Database**: Free tier on Neon, Supabase, or Railway works perfectly
5. **Cloudinary Account**: Free tier for uploading KB documents

---

## 1. Setup Environment Variables

Copy the provided `.env.example` file to `.env` in the `server` directory:
```bash
cd server
cp .env.example .env
```
Fill in all the required variables.

### How to get the MongoDB URI
1. Log in to MongoDB Atlas and create a free M0 cluster.
2. Click **Connect** -> **Drivers** and copy the connection string.
3. Replace `<password>` with your database user's password.

### How to configure Cloudinary
1. Create a free Cloudinary account.
2. Go to your Dashboard and copy the Cloud Name, API Key, and API Secret.

---

## 2. Configure MongoDB Atlas Vector Search (CRITICAL)

The application uses MongoDB for chat sessions and Vector Search for the RAG knowledge base. You **must** create the vector search index manually in the Atlas UI, it cannot be created via code.

1. Go to your MongoDB Atlas dashboard -> **Atlas Search**.
2. Click **Create Search Index** -> **JSON Editor**.
3. Select your Database and Collection:
   - Database: `test` (or whatever your DB name is)
   - Collection: `doc_vectors`
4. Name the index: `vector_index`
5. Paste the following JSON:
```json
{
  "fields": [{
    "type": "vector",
    "path": "embedding",
    "numDimensions": 768,
    "similarity": "cosine"
  }]
}
```
6. Click **Next** -> **Create Search Index**. Wait a few minutes for it to build.

---

## 3. Seed PostgreSQL Data

The application requires some initial dummy data to function (users, products, orders, refunds). 

1. Ensure your Postgres database is empty (or safe to wipe).
2. Run the seed script:
```bash
cd server
npm install
node seed.js
```
This will automatically create all tables and populate them with realistic mock data.
*Demo Admin Credentials:* `alice.johnson@example.com` / `password123`

---

## 4. Ingest Knowledge Base Documents

The chatbot needs a knowledge base to answer company-specific questions (RAG).
A script is provided to automatically ingest some sample policies and FAQs:

```bash
cd server
node ingest_kb.js
```
This script splits the text into chunks, generates embeddings using Gemini, and saves them to MongoDB.

---

## 5. Run the Application

Now you are ready to start both servers.

**Terminal 1: Start the Backend**
```bash
cd server
npm run dev
```

On Windows PowerShell, if script execution blocks `npm.ps1`, run
`npm.cmd run dev` instead.
The backend will run on `http://localhost:5000`.

**Terminal 2: Start the Frontend**
```bash
cd client
npm install
npm run dev
```
- The frontend should be accessible at **http://localhost:8080**.

---

## 6. Test End-to-End

Open `http://localhost:8080` in your browser. Try asking the following questions to test the 4 different AI agent tools:

1. **Test Postgres querying**: *"Where is my order #5?"*
2. **Test action tools**: *"I want a refund for order #3"*
3. **Test RAG (Vector Search)**: *"What is your return policy for electronics?"*
4. **Test Human Escalation**: *"I want to speak to a human manager right now!"*

You can also log in using `alice.johnson@example.com` / `password123` to access the Admin Panel at `/admin` and view escalation tickets and analytics.
