# PostCSS Plugin Custom Satisfies

[PostCSS] plugin for constraints.

[PostCSS]: https://github.com/postcss/postcss

```css
/* Input example */
.Padded {
    padding: 1em;
    @constraint;
}

.Bordered {
    border-width: 0.25em;
    @constraint;
}

.Boxy {
    margin: 1em;
    border-width: 0.25em;
    @satisfies Padded;
    @satisfies Bordered;
}
```

```css
/* Output example */
.Padded {
    padding: 1em;
}

.Bordered {
    border-width: 0.25em;
}

.Boxy {
    margin: 1em;
    border-width: 0.25em;
}
```

## Usage

Check you project for existed PostCSS config: `postcss.config.js`
in the project root, `"postcss"` section in `package.json`
or `postcss` in bundle config.

If you already use PostCSS, add the plugin to plugins list:

```diff
module.exports = {
  plugins: [
+   require('postcss-plugin-custom-satisfies'),
    require('autoprefixer')
  ]
}
```

If you do not use PostCSS, add it according to [official docs]
and set this plugin in settings.

[official docs]: https://github.com/postcss/postcss#usage
