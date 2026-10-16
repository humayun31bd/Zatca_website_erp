---
name: "flutter_run_chrome"
description: "Always run Flutter on Chrome instead of Windows Desktop"
---
# Flutter Target

When asked to run the Flutter frontend in this workspace, ALWAYS use Chrome as the target device:
`flutter run -d chrome`

Do NOT use `flutter run -d windows` unless explicitly told to do so, as the user's machine is not configured with Developer Mode for Windows desktop symlinks.
