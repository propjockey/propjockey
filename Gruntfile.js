const wabt = require("wabt")()

module.exports = function (grunt) {

  // `-- grunt-testee@1.1.0
  // `-- testee@0.9.0
  //   +-- feathers@2.2.4
  //   | `-- express@4.16.4
  //   |   `-- send@0.16.2
  //   |     `-- mime@1.4.1  deduped
  //   `-- testee-client@0.5.3
  //     `-- superagent@3.8.3
  //       `-- mime@1.4.1
  // try { require("mime").types.wasm = "application/wasm" } catch (e) {}

  grunt.loadNpmTasks("grunt-steal")
  grunt.loadNpmTasks("grunt-eslint")
  grunt.loadNpmTasks("grunt-testee")

  grunt.initConfig({
    "steal-export": {
      dist: {
        steal: {
          config: "package.json!npm"
        },
        outputs: {
          "+cjs": {
            dest: moduleName => __dirname + "/dist/cjs/" + moduleName.replace(/propjockey.*src\//i, "") + ".js"
          },
          "+amd": {
            dest: moduleName => __dirname + "/dist/amd/" + moduleName.replace(/propjockey.*src\//i, "") + ".js"
          },
          "+global-js": {},
          "min": {
            format: "global",
            modules: ["propjockey"],
            dest: __dirname + "/dist/global/propjockey.min.js",
            minify: true
          }
        }
      }
    },
    "eslint": {
      options: {
        configFile: ".eslintrc.json"
      },
      target: ["Gruntfile.js", "src/**/*.js", "test/**/*.js"]
    },
    "testee": {
      options: {
        // timeout: 6000,
        reporter: "dot",
        browsers: ["firefox"],
        coverage: {
          ignore: ["node_modules", "dist", "wasm.js"],
          reporters: ["lcov", "text", "html"]
        },
        "tunnel": {
          "type": "local"
        }
      },
      src: ["test/test.html"]
    },
    "wasm": {
      wast: {
        cwd: "src/",
        src: ["**/*.wast"],
        expand: true,
        dest: "wasm/",
        ext: ".compiled.wasm"
      },
      portable: {
        cwd: "wasm/",
        src: ["**/*.wasm"],
        expand: true,
        dest: "src/",
        ext: ".transpiled.wasm.js"
      }
    }
  })

  grunt.registerMultiTask("wasm", function () {
    if (this.data.ext === ".compiled.wasm") {
      // compile wast into wasm
      this.files.forEach(file => {
        const src = file.src
        const dest = file.dest
        grunt.log.writeln((src + " -> " + dest).grey)

        const wast = grunt.file.read(src)
        const wasmModule = wabt.parseWat("module.wast", wast)
        const { buffer } = wasmModule.toBinary({})

        grunt.file.write(dest, new Buffer(buffer))
      })
    } else {
      // build portable js module from wasm binary
      this.files.forEach(file => {
        const src = file.src
        const dest = file.dest
        grunt.log.writeln((src + " -> " + dest).grey)
        const uint8 = grunt.file.read(src, { encoding: null })
        const hex = uint8.reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")
        const output = `
          const u8 = new Uint8Array(${hex.length >> 1})
          "${hex}".replace(/../g, (b, o) => (u8[o >> 1] = parseInt(b, 16), b))
          const module = new WebAssembly.Module(u8.buffer)
          const instance = new WebAssembly.Instance(module)

          export { module, instance }
        `.replace(/^ */gm, "")
        grunt.file.write(dest, output)
      })
    }
  })
  grunt.registerTask("build", ["wasm:wast", "wasm:portable", "steal-export"])
  grunt.registerTask("test", ["eslint", "testee"])
}
