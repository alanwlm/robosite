# Deployment to GitHub Pages

This project is configured to deploy to GitHub Pages under the `/robosite` path.

## Setup Instructions

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Configure for GitHub Pages deployment"
   git push origin main
   ```

2. **Enable GitHub Pages in your repository settings:**
   - Go to your repository on GitHub
   - Navigate to `Settings` > `Pages`
   - Under "Source", select `GitHub Actions`

3. **The site will automatically deploy when you push to the main branch**
   - The workflow is defined in `.github/workflows/deploy.yml`
   - You can monitor deployment progress in the `Actions` tab

4. **Access your site at:**
   ```
   https://<your-username>.github.io/robosite/
   ```

## Configuration Details

- **Base Path:** `/robosite/` (configured in `vite.config.ts`)
- **Build Output:** `build/` directory
- **Deploy Trigger:** Pushes to `main` branch or manual workflow dispatch

## Local Testing with Production Build

To test the production build locally with the correct base path:

```bash
npm run build
npx serve build -p 3000
```

Then visit `http://localhost:3000/robosite/`

## Notes

- The `.nojekyll` file prevents GitHub Pages from processing files with Jekyll
- All assets in the `public/` folder are served relative to the base path automatically
- The backend server (`server/`) is not deployed to GitHub Pages (frontend only)

