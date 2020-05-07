let postcss = require('postcss');

const getConstraintNameFromSelector = (baseRule, atRule, result) => {
    let constraintName;

    if (baseRule.selectors.length !== 1) {
        throw atRule.error(
            `@${atRule.name} base rule must specify single selector`
        );
    }

    let selector = require('postcss-selector-parser');

    let container = selector().astSync(atRule.parent.selector);

    container.walkClasses((className) => {
        constraintName = className.value;

        return false;
    });

    return constraintName;
};

const processSatisfiesAtRule = (checkSatisfiesRule, atRule, result) => {
    let baseRule = atRule.parent.clone();

    baseRule.source = atRule.source;

    if (baseRule.type !== 'rule') {
        throw atRule.error(`@${atRule.name} must be in rule scope`);
    }

    let atRuleParams = postcss.list.comma(atRule.params);

    if (atRuleParams.length === 0 || !atRuleParams[0]) {
        throw atRule.error(`@${atRule.name} must specify constraint`);
    }

    let constraintName = atRuleParams.join(', ');

    checkSatisfiesRule.call(constraintName, baseRule, atRule, result);

    atRule.remove();
};

const processConstraintAtRule = (registerConstraintRule, atRule, result) => {
    let baseRule = atRule.parent.clone();

    baseRule.source = atRule.source;

    if (baseRule.type !== 'rule') {
        throw atRule.error(`@${atRule.name} must be in rule scope`);
    }

    let atRuleParams = postcss.list.comma(atRule.params);

    let constraintName;

    if (atRuleParams.length && atRuleParams[0]) {
        constraintName = atRuleParams.join(', ');
    } else {
        constraintName = getConstraintNameFromSelector(
            baseRule,
            atRule,
            result
        );
    }

    if (!constraintName) {
        throw atRule.error(`@${atRule.name} must specify constraint name`);
    }

    baseRule.each((node) => {
        if (
            node.type === 'atrule' &&
            node.name.match(/(constraint|satisfies)/)
        ) {
            node.remove();
        }

        if (node.type === 'comment') {
            node.remove();
        }
    });

    registerConstraintRule.call(constraintName, baseRule, atRule, result);

    atRule.remove();
};

const processSatisfiesAtRules = (
    checkSatisfiesRule,
    registerConstraintRule,
    container,
    result
) => {
    container.walkAtRules(/(satisfies|constraint)/, (atRule) => {
        if (atRule.name === 'satisfies') {
            processSatisfiesAtRule(checkSatisfiesRule, atRule, result);
        }

        if (atRule.name === 'constraint') {
            processConstraintAtRule(registerConstraintRule, atRule, result);
        }
    });
};

const checkSatisfiesConstraintRule = (constraintRule) => (node) => {
    if (constraintRule.type !== node.type) {
        return false;
    }

    if (constraintRule.type === 'atrule' && constraintRule.name !== node.name) {
        return false;
    }

    if (
        constraintRule.type === 'atrule' &&
        constraintRule.params !== node.params
    ) {
        return false;
    }

    if (
        constraintRule.type === 'rule' &&
        constraintRule.selector !== node.selector
    ) {
        return false;
    }

    if (constraintRule.type === 'decl' && constraintRule.prop !== node.prop) {
        return false;
    }

    if (constraintRule.type === 'decl' && constraintRule.value !== node.value) {
        return false;
    }

    // if (constraintRule.type === 'decl' && constraintRule.important !== node.important) {
    //     return false;
    // }

    // if (constraintRule.type === 'comment' && constraintRule.text !== node.text) {
    // 	return false;
    // }

    if (constraintRule.type === 'atrule' || constraintRule.type === 'rule') {
        return checkSatisfiesConstraintRuleContainer(constraintRule)(node);
    }

    return true;
};

const checkSatisfiesConstraintRuleContainer = (constraintRules) => (
    container
) => {
    return constraintRules.every((constraintRule) =>
        container.some(checkSatisfiesConstraintRule(constraintRule))
    );
};

class CheckSatisfiesRule {
    constructor(constraintMap) {
        this.constraintMap = constraintMap;
    }

    call(constraintName, baseRule, atRule, result) {
        let satisfies = this.constraintMap.get(constraintName);

        if (!satisfies) {
            atRule.warn(result, `undefined constraint: '${constraintName}'`);
        }

        if (satisfies && !satisfies(baseRule)) {
            atRule.warn(result, `fails to satisfy: '${constraintName}'`);
        }
    }
}

class RegisterConstraintRule {
    constructor(constraintMap) {
        this.constraintMap = constraintMap;
    }

    registerConstraint(constraintName, predicate, atRule, result) {
        if (this.constraintMap.has(constraintName)) {
            throw atRule.error(
                `@${atRule.name} '${constraintName}' already exists`
            );
        }

        this.constraintMap.set(constraintName, predicate);
    }

    call(constraintName, baseRule, atRule, result) {
        this.registerConstraint(
            constraintName,
            checkSatisfiesConstraintRuleContainer(baseRule),
            atRule,
            result
        );
    }
}

module.exports = postcss.plugin(
    'postcss-plugin-custom-satisfies',
    (opts = {}) => {
        const defaultOpts = {
            constraintMap: {},
            checkSatisfiesRuleClass: CheckSatisfiesRule,
            registerConstraintRuleClass: RegisterConstraintRule,
        };

        opts = { ...defaultOpts, ...opts };

        let constraintMap = new Map(Object.entries(opts.constraintMap));

        let checkSatisfiesRule = new opts.checkSatisfiesRuleClass(
            constraintMap
        );

        let registerConstraintRule = new opts.registerConstraintRuleClass(
            constraintMap
        );

        return (root, result) => {
            processSatisfiesAtRules(
                checkSatisfiesRule,
                registerConstraintRule,
                root,
                result
            );
        };
    }
);
