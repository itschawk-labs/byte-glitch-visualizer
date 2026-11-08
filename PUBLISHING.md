# Publish BYTE / GLITCH on GitHub

The GitHub repository cannot be created by this package. Create it in your GitHub account first.

1. Open https://github.com/new while signed in as `itschawk-labs`.
2. Set repository name to `byte-glitch-visualizer` and visibility to **Public**.
3. Do **not** add a README, `.gitignore`, or license on GitHub when creating the repository; these files are already included here.
4. Extract the `byte-glitch-github-source.zip` package.
5. Open a terminal in the extracted `byte-glitch-visualizer` directory and run:

```bash
git init -b main
git add .
git commit -m "Initial BYTE / GLITCH release"
git remote add origin https://github.com/itschawk-labs/byte-glitch-visualizer.git
git push -u origin main
```

You may need to sign in to GitHub through your credential manager. Do not place GitHub tokens or secrets in these files.

Once pushed, the expected repository URL is:
https://github.com/itschawk-labs/byte-glitch-visualizer

You can connect the new repo to the existing Netlify site later for continuous deployment, but the immediate redeploy should be to your **existing** site to preserve `qubyte-chawk.netlify.app`.
