---
type: how-to
tags:
  - language
  - clojure
  - cli
related:
  - languages/clojure/cli/overview
  - languages/clojure/project-setup
  - languages/clojure/namespaces-and-deps
  - languages/clojure/error-handling
language: "clojure"
---

# How to Build a CLI in Clojure

> A hands-on guide: parse arguments with `tools.cli`, write a fast babashka script, add subcommands with `cli-matic` or `babashka/cli`, package the tool, and wire up correct exit codes and streams.

---

## Prerequisites

- For scripting: **babashka** installed (`bb`). For JVM tools: a Clojure CLI setup with `deps.edn` — see [Project Setup](../project-setup.md) and [Namespaces and Dependencies](../namespaces-and-deps.md).
- Familiarity with Clojure basics: destructuring, maps, and [error handling](../error-handling.md).

This guide bakes in the CLI conventions that matter — **exit codes**, **stdout vs. stderr**, and **honoring `NO_COLOR`** — as it goes.

## Steps

### 1. Parse arguments with `tools.cli`

`clojure.tools.cli/parse-opts` takes the argument vector and an option spec, returning a map with `:options`, `:arguments`, `:summary` (generated help), and `:errors`.

```clojure
(require '[clojure.tools.cli :refer [parse-opts]])

(def cli-options
  [["-v" "--verbose" "verbose output"]
   ["-c" "--count N" "how many times to repeat"
    :default 1 :parse-fn #(Integer/parseInt %)]
   ["-h" "--help"]])

(defn -main [& args]
  (let [{:keys [options arguments summary errors]} (parse-opts args cli-options)]
    (cond
      errors        (do (binding [*out* *err*] (println (clojure.string/join \newline errors)))
                        (System/exit 2))                 ; 2 = usage error
      (:help options) (println summary)
      (empty? arguments) (do (binding [*out* *err*] (println "usage: repeat [opts] TEXT"))
                             (System/exit 2))
      :else (dotimes [_ (:count options)]
              (println (first arguments))))))
```

`parse-opts` handles `--flag`, `--opt value`, defaults, and `:parse-fn` coercion, and builds `:summary` for you. `:errors` is non-nil on bad input — print it to stderr and exit `2`.

### 2. Write a babashka script

For scripting, drop the ceremony: a shebang, `*command-line-args*`, and instant startup (see [Overview](overview.md#how-it-works)).

```clojure
#!/usr/bin/env bb
(require '[clojure.tools.cli :refer [parse-opts]])

(def opts [["-c" "--count N" :default 1 :parse-fn #(Integer/parseInt %)]])
(let [{:keys [options arguments]} (parse-opts *command-line-args* opts)]
  (dotimes [_ (:count options)] (println (first arguments))))
```

```console
$ chmod +x repeat.clj && ./repeat.clj --count 3 hi
hi
hi
hi
```

### 3. Add subcommands

For a git-style tool, **`cli-matic`** lets you describe the whole interface as data and handles parsing, help, and dispatch:

```clojure
(require '[cli-matic.core :refer [run-cmd]])

(defn add-cmd [{:keys [task priority]}]
  (println (str "added: " task " (priority " priority ")")))

(def CONFIG
  {:command "todo"
   :description "A tiny task manager"
   :subcommands
   [{:command "add"
     :description "Add a new task"
     :opts [{:option "task" :as "task text" :type :string :default :present}
            {:option "priority" :short "p" :as "priority" :type :int :default 1}]
     :runs add-cmd}]})

(defn -main [& args] (run-cmd args CONFIG))
```

```console
$ clojure -M -m todo.core add --task "buy milk" -p 2
added: buy milk (priority 2)
```

On babashka, **`babashka/cli`** is the lighter, data-first alternative — it can expose functions directly as subcommands and maps flags straight into a Clojure map.

### 4. Use exit codes and streams correctly

- **Results to `*out*`, diagnostics to `*err*`** — rebind `*out*` to `*err*` (as above) so `tool > out.txt` captures only real output.
- **Exit non-zero on failure.** `0` = success, `1` = general error, `2` = usage error, via `(System/exit code)`. Only call `System/exit` at the top level of `-main`, not deep in logic.
- **Respect `NO_COLOR` and non-TTY output.** Colorize only when attached to a terminal.

```clojure
(def use-color?
  (and (System/console)                             ; nil when not a TTY
       (nil? (System/getenv "NO_COLOR"))))
(defn ok [s] (if use-color? (str "[32m" s "[0m") s))
```

### 5. Package and distribute

- **babashka script** — ship the `.clj` file (with shebang) or add it as a task in `bb.edn` (`bb run <task>`); users run it with `bb`.
- **JVM uberjar** — build a runnable jar (e.g. with `tools.build` / `depstar`) and run with `java -jar`. See [Deploy](../deploy.md).
- **GraalVM native-image** — compile the uberjar to a fast-starting native binary when you need JVM libraries *and* instant startup.

### 6. Keep it testable

Put logic in pure functions that return data (or take an output writer), and keep `-main` thin — parse, call, translate to an exit code. Don't call `System/exit` inside the logic you want to test. See [Testing](../testing.md).

```clojure
(defn add-task
  "Pure: returns the message to print."
  [task priority]
  (str "added: " task " (priority " priority ")"))
```

```clojure
(require '[clojure.test :refer [deftest is]])
(deftest add-task-test
  (is (= "added: buy milk (priority 2)" (add-task "buy milk" 2))))
```

## Verification

Run the script (or JVM entry point) and exercise each path:

```bash
./repeat.clj --count 3 hi          # expect: hi printed 3 times
bb todo.clj add --task x -p 2       # expect: added: x (priority 2)
clojure -M -m todo.core --help      # expect: generated usage/summary
echo $?                             # expect: 0 on success, non-zero on error
```

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Slow startup on the JVM path | JVM boot + class loading | Use babashka for scripts, or GraalVM native-image for a JVM tool |
| `:count` is a string | No `:parse-fn` on the option | Add `:parse-fn #(Integer/parseInt %)` |
| Bad input exits `0` | Ignoring `:errors` from `parse-opts` | Check `:errors`, print to `*err*`, `(System/exit 2)` |
| Errors printed to stdout | Not rebinding `*out*` | Wrap diagnostics in `(binding [*out* *err*] …)` |
| `bb` can't resolve a dependency | Library not bundled with babashka | Add it via `bb.edn` `:deps`, or run on the JVM instead |
| Colors leak into piped output | Colorizing unconditionally | Gate on `(System/console)` and `NO_COLOR` |

## References

- [babashka book](https://book.babashka.org/) — scripting, `bb.edn` tasks, and shebangs.
- [`clojure.tools.cli`](https://github.com/clojure/tools.cli)
- [`babashka/cli`](https://github.com/babashka/cli)
- [`cli-matic`](https://github.com/l3nz/cli-matic)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
