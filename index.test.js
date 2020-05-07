let postcss = require('postcss');

let plugin = require('./');

let fs = require('fs');

async function run(fixture, opts, warnCount = 0) {
    let input = fs.readFileSync(`fixtures/${fixture}.in.css`, 'utf-8').trim();
    let output = fs.readFileSync(`fixtures/${fixture}.out.css`, 'utf-8').trim();
    let result = await postcss([plugin(opts)]).process(input, {
        from: undefined,
    });

    expect(result.css).toEqual(output);

    expect(result.warnings()).toHaveLength(warnCount);
}

it('success', async () => {
    await run('success', {});
});

it('unnamed', async () => {
    await run('unnamed', {}, 0);
});

it('warning', async () => {
    await run('warning', {}, 1);
});
