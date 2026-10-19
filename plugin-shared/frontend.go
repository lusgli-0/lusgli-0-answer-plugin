package pluginshared

import "embed"

// Frontend TypeScript lives in src/. answer build runs `go mod vendor`,
// which only copies Go packages plus files named by //go:embed.
// Without this, src/ is dropped; sibling plugins then fail tsc with
// "Cannot find module 'plugin-shared'" after the UI copy.
//
//go:embed src
var frontendSrc embed.FS
