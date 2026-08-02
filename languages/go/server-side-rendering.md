---
type: concept
tags:
  - language
  - go
  - frontend
  - rendering
  - full-stack
related:
  - languages/go/web-servers
  - languages/go/full-stack-monolith
  - languages/go/webassembly
  - languages/go/overview
language: "go"
---

# Server-Side Rendering in Go

> Producing HTML on the server with `html/template`, composing layouts and partials, bundling views into the binary with `embed`, and the modern `templ` + `htmx` stack that brings a component-like model close to Next.js.

---

## What is it?

**Server-side rendering (SSR)** means the server builds the final HTML for each request and sends it to the browser, instead of shipping a blank page plus JavaScript that renders on the client. In Go the standard tool is the `html/template` package: you write templates with `{{ }}` actions, execute them against typed data, and write the result to the `http.ResponseWriter`.

There are three practical ways to render a frontend from Go, from lightest to most feature-rich:

1. **`html/template`** — the standard library, zero dependencies.
2. **`templ` + `htmx`** — typed, compiled components plus server-driven interactivity.
3. **A prebuilt JS SPA** served by Go, with Go owning the API (covered in the [Full-Stack Monolith](full-stack-monolith.md) guide).

---

## Why does it matter?

SSR sends usable HTML on the first byte: better perceived performance, first-class SEO, and no need for a separate frontend build or server for many apps. Because Go compiles to a single binary, an SSR app plus its templates and assets can ship as **one artifact** — the appeal that makes people compare a Go monolith to Next.js.

`html/template` matters specifically for **security**. Unlike its sibling `text/template`, it performs **contextual auto-escaping**: it knows whether a value lands inside HTML text, an attribute, a URL, JavaScript, or CSS, and escapes it accordingly. This neutralizes most cross-site scripting (XSS) without the developer remembering to escape anything. Choosing `text/template` for HTML is a security antipattern.

---

## How it works

### Parsing and executing templates

Templates are parsed once (ideally at startup) and executed per request:

```go
package main

import (
    "html/template"
    "net/http"
)

// Parse at startup; panic here fails fast if a template is malformed.
var tmpl = template.Must(template.ParseFiles("home.html"))

type PageData struct {
    Title string
    User  string
}

func home(w http.ResponseWriter, r *http.Request) {
    data := PageData{Title: "Home", User: "Ada"}
    if err := tmpl.Execute(w, data); err != nil {
        http.Error(w, "render error", http.StatusInternalServerError)
    }
}
```

Fields are accessed with `{{ .Title }}`; the leading dot is the current data value.

### Layouts and partials

Real apps share a layout across pages. `{{define}}` names a template block and `{{template}}` includes one, so a base layout can pull in a page-specific `content`:

```html
<!-- layout.html -->
{{define "layout"}}
<!DOCTYPE html>
<html>
  <head><title>{{.Title}}</title></head>
  <body>
    {{template "content" .}}   <!-- inject the page body, passing data through -->
  </body>
</html>
{{end}}
```

```html
<!-- home.html -->
{{define "content"}}
  <h1>Welcome, {{.User}}</h1>
  {{template "greeting" .}}    <!-- a reusable partial -->
{{end}}

{{define "greeting"}}<p>Good to see you, {{.User}}.</p>{{end}}
```

```go
var tmpl = template.Must(template.ParseFiles("layout.html", "home.html"))

func home(w http.ResponseWriter, r *http.Request) {
    // Execute the named layout, not the file.
    tmpl.ExecuteTemplate(w, "layout", PageData{Title: "Home", User: "Ada"})
}
```

The final `.` in `{{template "content" .}}` forwards the data; omit it and the partial receives `nil`.

### Bundling templates with `embed`

Reading templates from disk at runtime means the binary is not self-contained. The `embed` package compiles files into the binary, so the executable carries its own views — central to the single-artifact model:

```go
import "embed"

//go:embed templates/*.html
var files embed.FS

var tmpl = template.Must(template.ParseFS(files, "templates/*.html"))
```

`ParseFS` reads from the embedded filesystem instead of the OS disk. Now `go build` produces one file that renders pages with no external dependencies.

### The modern stack: templ + htmx

`html/template` is untyped: a typo in a field name or a wrong data shape only surfaces at runtime. **`templ`** (`a-h/templ`) closes that gap. You write components in `.templ` files, run `templ generate`, and get **type-checked Go functions** that render HTML — the closest Go gets to a component model like JSX.

```go
// hello.templ — compiled by `templ generate` into hello_templ.go
package views

templ Hello(name string) {
    <div class="greeting">Hello, { name }!</div>
}
```

```go
// The generated component renders straight to an io.Writer.
func handler(w http.ResponseWriter, r *http.Request) {
    views.Hello("Ada").Render(r.Context(), w)
}
```

**`htmx`** complements it on the client: HTML attributes issue AJAX requests and swap the returned HTML fragment into the page — interactivity without writing JavaScript, and without a client-side framework. The server keeps returning HTML (rendered by `templ` or `html/template`); htmx just decides where to put it.

```html
<!-- Clicking the button POSTs to /like and replaces #count with the response HTML. -->
<button hx-post="/like" hx-target="#count" hx-swap="innerHTML">Like</button>
<span id="count">0</span>
```

Together, `templ` + `htmx` give a server-rendered, component-structured, interactive app — the practical Go analogue to a Next.js experience — while keeping rendering on the server.

---

## Examples

A complete handler using an embedded layout + partial:

```go
//go:embed templates/*.html
var templateFS embed.FS

var pages = template.Must(template.ParseFS(templateFS, "templates/*.html"))

func dashboard(w http.ResponseWriter, r *http.Request) {
    data := PageData{Title: "Dashboard", User: r.PathValue("user")}
    if err := pages.ExecuteTemplate(w, "layout", data); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}
```

For an interactive counter, the same handler pattern returns just the fragment htmx asked for — no full-page reload.

---

## When to use

- **`html/template`** — content-driven pages, admin panels, and apps where a JS framework is overkill; you want zero dependencies and maximum stability.
- **`templ` + `htmx`** — interactive apps where you want a component model and type safety but prefer to keep logic and rendering on the server (the Next.js-like path in Go).
- **Prebuilt SPA served by Go** — when the frontend genuinely needs a rich client framework (React/Vue) but you still want a single deployable binary; Go serves the built assets and the API (see the [Full-Stack Monolith](full-stack-monolith.md) guide).

## When NOT to use

- Highly dynamic, offline-capable, or heavily stateful client UIs — a client-side framework is a better fit; use Go as the API and, if needed, share logic via [WebAssembly](webassembly.md).
- Never use `text/template` to produce HTML — it does not auto-escape and invites XSS. Reserve it for non-HTML output.
- Don't re-parse templates on every request in production — parse once at startup (`template.Must`) to catch errors early and avoid per-request cost.

## References

- Go Team. [`html/template` package](https://pkg.go.dev/html/template). pkg.go.dev.
- a-h. [templ — HTML templating for Go](https://templ.guide/). templ.guide.
- htmx. [htmx documentation](https://htmx.org/docs/). htmx.org.
