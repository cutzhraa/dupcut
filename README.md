# DupCut

DupCut finds exact duplicate files by comparing SHA-256 content hashes, and groups visually similar images with a perceptual hash. File names do not affect matching. For similar images, it keeps the version with the most pixels as the unique copy. All scanning and copying happens in the user's browser; files are not sent to a server.

## Run locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

The production site is generated in `dist/`. Vercel can deploy this project using its Vite preset and `dist` as the output directory. No server-side file upload or API route is required.

## Use

1. Select individual files or a folder.
2. Start the scan. Identical files are detected by content. Similar images are compared visually, even when compressed or resized differently.
3. In Chrome or Edge, choose an output folder to copy the results into `Unique/` and `Duplicates/`. Original files are not modified or deleted.
4. Open the **Rename** page to choose a folder, preview sequential names or folder-name-plus-number names, and copy renamed files into an output folder's `Renamed/` subfolder.
5. Open the **Audio** page to inspect an audio file in the browser and optionally convert it to a standard 44.1 kHz stereo MP3.

For similar images, "highest resolution" means the image with the most pixels; it does not guarantee the sharpest-looking photo. Perceptual matching can have false positives, so review the results before separating them. Images the browser cannot decode are checked only for exact duplicates.

Large selections are read one file at a time in chunks, but scan speed and practical limits depend on the user's device and browser. The folder output action uses the File System Access API, so it is not available in every browser.

The rename page sorts source files by relative path, keeps each file extension, and avoids overwriting files already present in the `Renamed/` output folder.

The audio tool decodes supported files locally in the browser and encodes MP3 locally. Conversion is limited to files up to 25 MB and 15 minutes to reduce browser memory risk. A standard MP3 is not guaranteed to work on every speaker; the speaker's supported formats and USB filesystem can also matter.
