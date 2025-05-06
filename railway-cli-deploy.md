# Railway CLI Deployment for AWIB SACCOS Backend

This guide provides step-by-step instructions for deploying your SACCO backend with SMS features using the Railway CLI.

## Step 1: Prepare your Backend

Make sure your `package.json` has the proper scripts:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "build": "echo 'Backend build completed'"
}
```

## Step 2: Initialize a New Railway Project

Run the following commands in sequence:

```bash
# First login to Railway - this will open a browser window
railway login

# Initialize a new project 
railway init

# When asked "Would you like to create a new project?", select "Yes"
# When asked "What would you like to name your project?", enter "awib-sacco-backend"
```

## Step 3: Add PostgreSQL Plugin

```bash
# Add PostgreSQL service to your project
railway add
```
When prompted, select "PostgreSQL" as the plugin to add.

## Step 4: Link Your Local Project

```bash
# Link your local directory to the project
railway link
```

## Step 5: Set Up Environment Variables

```bash
# Set necessary environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your_jwt_secret_here
railway variables set SESSION_SECRET=your_session_secret_here
railway variables set PORT=5000
railway variables set SMS_PROVIDER_API_KEY=your_api_key_here
railway variables set SMS_PROVIDER_SECRET=your_secret_here
```

## Step 6: Deploy Your Application

```bash
# Deploy your application
railway up
```

## Step 7: Verify and Get Your Deployment URL

```bash
# Open your deployment in browser
railway open
```

## Step 8: Update Your Frontend Configuration

Set your Netlify frontend environment variable:
- `NEXT_PUBLIC_API_URL=https://your-railway-app-url`

## Troubleshooting

If you encounter deployment errors:

1. **Package.json Not Found**:
   - Make sure you're in the correct directory
   - Run `railway whoami` to confirm you're logged in
   - Try `railway status` to check your current project

2. **Build Errors**:
   - Check your Dockerfile for any issues
   - Try `railway run npm start` to test locally

3. **Database Connection Issues**:
   - Verify DATABASE_URL is properly set
   - Check that your connection handling code supports SSL

4. **SMS Configuration**:
   - Ensure all SMS provider credentials are set correctly
   - Test the Tanzania phone validation with your provider
