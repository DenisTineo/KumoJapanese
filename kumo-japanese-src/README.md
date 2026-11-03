# Kumo Japanese

Reconstructed maintainable source for Kumo Japanese 2.7.0.

## Sentence builder

Open **Sentence builder**, choose the language of the sentence you will type, and select **Translate & shuffle**. Kumo requests a Japanese translation, splits it into word tiles, shuffles the tiles, and asks you to rebuild the translated sentence.

Translation uses the [MyMemory REST API](https://mymemory.translated.net/doc/spec.php), requires an internet connection, and sends only the sentence you submit plus the selected source language. MyMemory documents a 500-byte maximum per request and an anonymous daily usage limit; see its [usage limits](https://mymemory.translated.net/doc/usagelimits.php).

## Development

```powershell
npm.cmd install
npm.cmd start
```

## Build the Windows update installer

```powershell
npm.cmd run dist
```

The generated assisted NSIS installer is written to `release/Kumo Japanese Setup 2.7.0.exe`. Its application ID and NSIS GUID match the installed 2.6.0 release, so running it against the existing installation performs an in-place upgrade. Learning progress remains in `%APPDATA%\kumo-japanese\learning-progress.json` and is not deleted by uninstall or upgrade.

For each later release, increment `version` in `package.json`, rebuild, and run the newer setup. Automatic internet updates would additionally require a controlled release-hosting endpoint and signing configuration; neither existed in the recovered installation.

Content describing external services and packaging behavior was rephrased from the linked official documentation.
