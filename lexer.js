'use strict';

class Lexer {
    static defunct(chr) {
        throw new Error('Unexpected character at index ' + (this.index - 1) + ': ' + chr);
    }
    static addRule(pattern, action, start) {
        let global = pattern.global;
        if (!global) {
            let flags = `g${ pattern.multiline ? 'm' : '' }${ pattern.ignoreCase ? 'i' : '' }`;
            pattern = new RegExp(pattern.source, flags);
        }
        if (!(action instanceof Function)) {
            let token = action;
            action = function (lexeme) {
                this.yytext = lexeme;
                return token;
            };
        }
        if (!start) {
            start = [0];
        }
        if (!this.hasOwnProperty('rules')) {
            this.rules = [];
        }
        this.rules.push({
            pattern: pattern,
            global: global,
            action: action,
            start: start
        });
    }
    constructor(defunct) {
        if (defunct instanceof Function) {
            this.defunct = defunct;
        } else {
            this.defunct = this.constructor.defunct;
        }
        this._tokens = [];
        this._remove = 0;
        this.state = 0;
        this.index = 0;
        this.input = '';
    }
    setInput(input) {
        this._tokens.length = 0;
        this._remove = 0;
        this.state = 0;
        this.index = 0;
        this.input = input;
        return this;
    }
    lex() {
        let input = this.input;
        if (this._tokens.length) return this._tokens.shift();
        this.reject = true;
        while (this.index <= input.length) {
            let matches = this._scan().splice(this._remove);
            let index = this.index;
            while (matches.length) {
                if (this.reject) {
                    let match = matches.shift();
                    let result = match.result;
                    let length = match.length;
                    this.index += length;
                    this.reject = false;
                    this._remove++;
                    let token = match.action.apply(this, result);
                    if (this.reject) {
                        this.index = result.index;
                    }
                    else if (typeof token !== 'undefined') {
                        if (Array.isArray(token)) {
                            this._tokens = token.slice(1);
                            token = token[0];
                        }
                        if (length) {
                            this._remove = 0;
                        }
                        return token;
                    }
                } else {
                    break;
                }
            }
            if (index < input.length) {
                if (this.reject) {
                    this._remove = 0;
                    let token = this.defunct(input.charAt(this.index++));
                    if (typeof token !== 'undefined') {
                        if (Array.isArray(token)) {
                            this._tokens = token.slice(1);
                            return token[0];
                        } else {
                            return token;
                        }
                    }
                } else {
                    if (this.index !== index) {
                        this._remove = 0;
                    }
                    this.reject = true;
                }
            } else if (matches.length) {
                this.reject = true;
            } else {
                break;
            }
        }
    }
    _scan() {
        var matches = [];
        var index = 0;

        var state = this.state;
        var lastIndex = this.index;
        var input = this.input;

        let rules = this.constructor.rules;

        for (var i = 0, length = rules.length; i < length; i++) {
            var rule = rules[i];
            var start = rule.start;
            var states = start.length;

            if ((!states || start.indexOf(state) >= 0) ||
                (state % 2 && states === 1 && !start[0])) {
                var pattern = rule.pattern;
                pattern.lastIndex = lastIndex;
                var result = pattern.exec(input);

                if (result && result.index === lastIndex) {
                    var j = matches.push({
                        result: result,
                        action: rule.action,
                        length: result[0].length
                    });

                    if (rule.global) index = j;

                    while (--j > index) {
                        var k = j - 1;

                        if (matches[j].length > matches[k].length) {
                            var temple = matches[j];
                            matches[j] = matches[k];
                            matches[k] = temple;
                        }
                    }
                }
            }
        }
        return matches;
    }
}

module.exports = Lexer;
