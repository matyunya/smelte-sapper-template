
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.callbacks.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    function noop$1() {}

    function assign(tar, src) {
    	// @ts-ignore
    	for (const k in src) tar[k] = src[k];
    	return tar ;
    }

    function add_location$1(element, file, line, column, char) {
    	element.__svelte_meta = {
    		loc: { file, line, column, char }
    	};
    }

    function run$1(fn) {
    	return fn();
    }

    function blank_object$1() {
    	return Object.create(null);
    }

    function run_all$1(fns) {
    	fns.forEach(run$1);
    }

    function is_function$1(thing) {
    	return typeof thing === 'function';
    }

    function safe_not_equal$1(a, b) {
    	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function create_slot(definition, ctx, fn) {
    	if (definition) {
    		const slot_ctx = get_slot_context(definition, ctx, fn);
    		return definition[0](slot_ctx);
    	}
    }

    function get_slot_context(definition, ctx, fn) {
    	return definition[1]
    		? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
    		: ctx.$$scope.ctx;
    }

    function get_slot_changes(definition, ctx, changed, fn) {
    	return definition[1]
    		? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
    		: ctx.$$scope.changed || {};
    }

    function append$1(target, node) {
    	target.appendChild(node);
    }

    function insert$1(target, node, anchor) {
    	target.insertBefore(node, anchor || null);
    }

    function detach$1(node) {
    	if (!node.parentNode) return;

    	node.parentNode.removeChild(node);
    }

    function element$1(name) {
    	return document.createElement(name);
    }

    function text$1(data) {
    	return document.createTextNode(data);
    }

    function space$1() {
    	return text$1(' ');
    }

    function listen(node, event, handler, options) {
    	node.addEventListener(event, handler, options);
    	return () => node.removeEventListener(event, handler, options);
    }

    function attr$1(node, attribute, value) {
    	if (value == null) node.removeAttribute(attribute);
    	else node.setAttribute(attribute, value);
    }

    function children$1(element) {
    	return Array.from(element.childNodes);
    }

    function set_data$1(text, data) {
    	data = '' + data;
    	if (text.data !== data) text.data = data;
    }

    function toggle_class(element, name, toggle) {
    	element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component$1;

    function set_current_component$1(component) {
    	current_component$1 = component;
    }

    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
    	const callbacks = component.$$.callbacks[event.type];

    	if (callbacks) {
    		callbacks.slice().forEach(fn => fn(event));
    	}
    }

    const dirty_components$1 = [];

    const binding_callbacks$1 = [];
    const render_callbacks$1 = [];
    const flush_callbacks$1 = [];

    const resolved_promise$1 = Promise.resolve();
    let update_scheduled$1 = false;

    function schedule_update$1() {
    	if (!update_scheduled$1) {
    		update_scheduled$1 = true;
    		resolved_promise$1.then(flush$1);
    	}
    }

    function add_render_callback$1(fn) {
    	render_callbacks$1.push(fn);
    }

    function flush$1() {
    	const seen_callbacks = new Set();

    	do {
    		// first, call beforeUpdate functions
    		// and update components
    		while (dirty_components$1.length) {
    			const component = dirty_components$1.shift();
    			set_current_component$1(component);
    			update$1(component.$$);
    		}

    		while (binding_callbacks$1.length) binding_callbacks$1.pop()();

    		// then, once components are updated, call
    		// afterUpdate functions. This may cause
    		// subsequent updates...
    		for (let i = 0; i < render_callbacks$1.length; i += 1) {
    			const callback = render_callbacks$1[i];

    			if (!seen_callbacks.has(callback)) {
    				callback();

    				// ...so guard against infinite loops
    				seen_callbacks.add(callback);
    			}
    		}

    		render_callbacks$1.length = 0;
    	} while (dirty_components$1.length);

    	while (flush_callbacks$1.length) {
    		flush_callbacks$1.pop()();
    	}

    	update_scheduled$1 = false;
    }

    function update$1($$) {
    	if ($$.fragment) {
    		$$.update($$.dirty);
    		run_all$1($$.before_update);
    		$$.fragment.p($$.dirty, $$.ctx);
    		$$.dirty = null;

    		$$.after_update.forEach(add_render_callback$1);
    	}
    }

    const outroing$1 = new Set();
    let outros$1;

    function group_outros() {
    	outros$1 = {
    		remaining: 0,
    		callbacks: []
    	};
    }

    function check_outros() {
    	if (!outros$1.remaining) {
    		run_all$1(outros$1.callbacks);
    	}
    }

    function transition_in$1(block, local) {
    	if (block && block.i) {
    		outroing$1.delete(block);
    		block.i(local);
    	}
    }

    function transition_out$1(block, local, callback) {
    	if (block && block.o) {
    		if (outroing$1.has(block)) return;
    		outroing$1.add(block);

    		outros$1.callbacks.push(() => {
    			outroing$1.delete(block);
    			if (callback) {
    				block.d(1);
    				callback();
    			}
    		});

    		block.o(local);
    	}
    }

    function mount_component$1(component, target, anchor) {
    	const { fragment, on_mount, on_destroy, after_update } = component.$$;

    	fragment.m(target, anchor);

    	// onMount happens before the initial afterUpdate
    	add_render_callback$1(() => {
    		const new_on_destroy = on_mount.map(run$1).filter(is_function$1);
    		if (on_destroy) {
    			on_destroy.push(...new_on_destroy);
    		} else {
    			// Edge case - component was destroyed immediately,
    			// most likely as a result of a binding initialising
    			run_all$1(new_on_destroy);
    		}
    		component.$$.on_mount = [];
    	});

    	after_update.forEach(add_render_callback$1);
    }

    function destroy_component$1(component, detaching) {
    	if (component.$$.fragment) {
    		run_all$1(component.$$.on_destroy);

    		component.$$.fragment.d(detaching);

    		// TODO null out other refs, including component.$$ (but need to
    		// preserve final state?)
    		component.$$.on_destroy = component.$$.fragment = null;
    		component.$$.ctx = {};
    	}
    }

    function make_dirty$1(component, key) {
    	if (!component.$$.dirty) {
    		dirty_components$1.push(component);
    		schedule_update$1();
    		component.$$.dirty = blank_object$1();
    	}
    	component.$$.dirty[key] = true;
    }

    function init$1(component, options, instance, create_fragment, not_equal$$1, prop_names) {
    	const parent_component = current_component$1;
    	set_current_component$1(component);

    	const props = options.props || {};

    	const $$ = component.$$ = {
    		fragment: null,
    		ctx: null,

    		// state
    		props: prop_names,
    		update: noop$1,
    		not_equal: not_equal$$1,
    		bound: blank_object$1(),

    		// lifecycle
    		on_mount: [],
    		on_destroy: [],
    		before_update: [],
    		after_update: [],
    		context: new Map(parent_component ? parent_component.$$.context : []),

    		// everything else
    		callbacks: blank_object$1(),
    		dirty: null
    	};

    	let ready = false;

    	$$.ctx = instance
    		? instance(component, props, (key, value) => {
    			if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
    				if ($$.bound[key]) $$.bound[key](value);
    				if (ready) make_dirty$1(component, key);
    			}
    		})
    		: props;

    	$$.update();
    	ready = true;
    	run_all$1($$.before_update);
    	$$.fragment = create_fragment($$.ctx);

    	if (options.target) {
    		if (options.hydrate) {
    			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    			$$.fragment.l(children$1(options.target));
    		} else {
    			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    			$$.fragment.c();
    		}

    		if (options.intro) transition_in$1(component.$$.fragment);
    		mount_component$1(component, options.target, options.anchor);
    		flush$1();
    	}

    	set_current_component$1(parent_component);
    }

    class SvelteComponent$1 {
    	

    	$destroy() {
    		destroy_component$1(this, 1);
    		this.$destroy = noop$1;
    	}

    	$on(type, callback) {
    		const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
    		callbacks.push(callback);

    		return () => {
    			const index = callbacks.indexOf(callback);
    			if (index !== -1) callbacks.splice(index, 1);
    		};
    	}

    	$set() {
    		// overridden by instance, if it has props
    	}
    }

    class SvelteComponentDev$1 extends SvelteComponent$1 {
    	constructor(options) {
    		if (!options || (!options.target && !options.$$inline)) {
    			throw new Error(`'target' is a required option`);
    		}

    		super();
    	}

    	$destroy() {
    		super.$destroy();
    		this.$destroy = () => {
    			console.warn(`Component was already destroyed`); // eslint-disable-line no-console
    		};
    	}
    }

    /* Users/mac/Sites/smelte/src/components/Icon/Icon.svelte generated by Svelte v3.6.6 */

    const file = "Users/mac/Sites/smelte/src/components/Icon/Icon.svelte";

    function create_fragment(ctx) {
    	var i, i_class_value, current;

    	const default_slot_1 = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_1, ctx, null);

    	return {
    		c: function create() {
    			i = element$1("i");

    			if (default_slot) default_slot.c();

    			attr$1(i, "aria-hidden", "true");
    			attr$1(i, "class", i_class_value = "material-icons " + ctx.c);
    			toggle_class(i, "text-base", ctx.small);
    			toggle_class(i, "text-xs", ctx.xs);
    			add_location$1(i, file, 9, 0, 151);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(i_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert$1(target, i, anchor);

    			if (default_slot) {
    				default_slot.m(i, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
    			}

    			if ((!current || changed.c) && i_class_value !== (i_class_value = "material-icons " + ctx.c)) {
    				attr$1(i, "class", i_class_value);
    			}

    			if ((changed.c || changed.small)) {
    				toggle_class(i, "text-base", ctx.small);
    			}

    			if ((changed.c || changed.xs)) {
    				toggle_class(i, "text-xs", ctx.xs);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out$1(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach$1(i);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { c = "", color = "text-gray-700", small = false, xs = false } = $$props;

    	const writable_props = ['c', 'color', 'small', 'xs'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('c' in $$props) $$invalidate('c', c = $$props.c);
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('small' in $$props) $$invalidate('small', small = $$props.small);
    		if ('xs' in $$props) $$invalidate('xs', xs = $$props.xs);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	return { c, color, small, xs, $$slots, $$scope };
    }

    class Icon extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance, create_fragment, safe_not_equal$1, ["c", "color", "small", "xs"]);
    	}

    	get c() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set c(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get small() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set small(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xs() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xs(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function utils(color, defaultDepth = 500) {
      return {
        bg: depth => `bg-${color}-${depth || defaultDepth} `,
        border: depth => `border-${color}-${depth || defaultDepth} `,
        txt: depth => `text-${color}-${depth || defaultDepth} `,
        ripple: depth => `ripple-${color}-${depth || defaultDepth} `,
        caret: depth => `caret-${color}-${depth || defaultDepth} `
      };
    }

    class ClassBuilder {
      constructor() {
        this.classes = "";
      }

      flush() {
        this.classes = "";

        return this;
      }

      get() {
        return this.classes;
      }

      remove(classes, cond = true) {
        if (cond && classes) {
          this.classes = classes
            .split(" ")
            .reduce((acc, cur) => acc.replace(cur, ""), this.classes);
        }

        return this;
      }

      add(className, cond = true) {
        if (cond && className) {
          this.classes += ` ${className} `;
        }

        return this;
      }
    }

    /* Users/mac/Sites/smelte/src/components/Button/Button.svelte generated by Svelte v3.6.6 */

    const file$1 = "Users/mac/Sites/smelte/src/components/Button/Button.svelte";

    // (85:2) {#if icon}
    function create_if_block(ctx) {
    	var current;

    	var icon_1 = new Icon({
    		props: {
    		c: ctx.light ? ctx.txt() : 'white',
    		small: ctx.small,
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			icon_1.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component$1(icon_1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var icon_1_changes = {};
    			if (changed.light || changed.txt) icon_1_changes.c = ctx.light ? ctx.txt() : 'white';
    			if (changed.small) icon_1_changes.small = ctx.small;
    			if (changed.$$scope || changed.icon) icon_1_changes.$$scope = { changed, ctx };
    			icon_1.$set(icon_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(icon_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out$1(icon_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component$1(icon_1, detaching);
    		}
    	};
    }

    // (86:4) <Icon c={light ? txt() : 'white'} {small}>
    function create_default_slot(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text$1(ctx.icon);
    		},

    		m: function mount(target, anchor) {
    			insert$1(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.icon) {
    				set_data$1(t, ctx.icon);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach$1(t);
    			}
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var button, t, button_class_value, current, dispose;

    	var if_block = (ctx.icon) && create_if_block(ctx);

    	const default_slot_1 = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_1, ctx, null);

    	return {
    		c: function create() {
    			button = element$1("button");
    			if (if_block) if_block.c();
    			t = space$1();

    			if (default_slot) default_slot.c();

    			attr$1(button, "class", button_class_value = "" + ctx.classes + " button");
    			toggle_class(button, "border-solid", ctx.outlined);
    			toggle_class(button, "rounded-full", ctx.icon);
    			toggle_class(button, "w-full", ctx.block);
    			toggle_class(button, "rounded", ctx.basic || ctx.outlined || ctx.text);
    			toggle_class(button, "button", !ctx.icon);
    			add_location$1(button, file$1, 75, 0, 2298);

    			dispose = [
    				listen(button, "click", ctx.click_handler),
    				listen(button, "click", ctx.click_handler_1)
    			];
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(button_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert$1(target, button, anchor);
    			if (if_block) if_block.m(button, null);
    			append$1(button, t);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.icon) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in$1(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in$1(if_block, 1);
    					if_block.m(button, t);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out$1(if_block, 1, 1);
    				check_outros();
    			}

    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
    			}

    			if ((!current || changed.classes) && button_class_value !== (button_class_value = "" + ctx.classes + " button")) {
    				attr$1(button, "class", button_class_value);
    			}

    			if ((changed.classes || changed.outlined)) {
    				toggle_class(button, "border-solid", ctx.outlined);
    			}

    			if ((changed.classes || changed.icon)) {
    				toggle_class(button, "rounded-full", ctx.icon);
    			}

    			if ((changed.classes || changed.block)) {
    				toggle_class(button, "w-full", ctx.block);
    			}

    			if ((changed.classes || changed.basic || changed.outlined || changed.text)) {
    				toggle_class(button, "rounded", ctx.basic || ctx.outlined || ctx.text);
    			}

    			if ((changed.classes || changed.icon)) {
    				toggle_class(button, "button", !ctx.icon);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(if_block);
    			transition_in$1(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out$1(if_block);
    			transition_out$1(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach$1(button);
    			}

    			if (if_block) if_block.d();

    			if (default_slot) default_slot.d(detaching);
    			run_all$1(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	

      let { c = "", value = false, outlined = false, text = false, block = false, disabled = false, icon = null, small = false, light = false, dark = false, flat = false, color = "primary", removeClasses = "", addClasses = "", commonClasses = 'py-2 px-4 uppercase text-sm font-medium', basicClasses = 'text-white transition ripple-white', outlinedClasses = 'bg-transparent border border-solid', textClasses = 'bg-transparent border-none px-3 hover:bg-transparent', iconClasses = 'p-4 m-4 flex items-center', fabClasses = 'text-white px-4 hover:bg-transparent', smallClasses = 'p-2', disabledClasses = 'bg-gray-300 text-gray-500 elevation-none pointer-events-none hover:bg-gray-300 cursor-default', elevationClasses = 'hover:elevation-5 elevation-3' } = $$props;

      const fab = text && icon;
      const basic = !outlined && !text && !fab;
      const elevation = (basic || icon) && !disabled && !flat && !text;
      
      let classes = "";
      let shade = 0;
      // normal - 500, 300, 900
      // lighter - 400, 100, 800

      const {
        bg,
        border,
        txt,
        ripple,
      } = utils(color);

      const cb = new ClassBuilder();

    	const writable_props = ['c', 'value', 'outlined', 'text', 'block', 'disabled', 'icon', 'small', 'light', 'dark', 'flat', 'color', 'removeClasses', 'addClasses', 'commonClasses', 'basicClasses', 'outlinedClasses', 'textClasses', 'iconClasses', 'fabClasses', 'smallClasses', 'disabledClasses', 'elevationClasses'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function click_handler_1() {
    		const $$result = (value = !value);
    		$$invalidate('value', value);
    		return $$result;
    	}

    	$$self.$set = $$props => {
    		if ('c' in $$props) $$invalidate('c', c = $$props.c);
    		if ('value' in $$props) $$invalidate('value', value = $$props.value);
    		if ('outlined' in $$props) $$invalidate('outlined', outlined = $$props.outlined);
    		if ('text' in $$props) $$invalidate('text', text = $$props.text);
    		if ('block' in $$props) $$invalidate('block', block = $$props.block);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$props.disabled);
    		if ('icon' in $$props) $$invalidate('icon', icon = $$props.icon);
    		if ('small' in $$props) $$invalidate('small', small = $$props.small);
    		if ('light' in $$props) $$invalidate('light', light = $$props.light);
    		if ('dark' in $$props) $$invalidate('dark', dark = $$props.dark);
    		if ('flat' in $$props) $$invalidate('flat', flat = $$props.flat);
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('removeClasses' in $$props) $$invalidate('removeClasses', removeClasses = $$props.removeClasses);
    		if ('addClasses' in $$props) $$invalidate('addClasses', addClasses = $$props.addClasses);
    		if ('commonClasses' in $$props) $$invalidate('commonClasses', commonClasses = $$props.commonClasses);
    		if ('basicClasses' in $$props) $$invalidate('basicClasses', basicClasses = $$props.basicClasses);
    		if ('outlinedClasses' in $$props) $$invalidate('outlinedClasses', outlinedClasses = $$props.outlinedClasses);
    		if ('textClasses' in $$props) $$invalidate('textClasses', textClasses = $$props.textClasses);
    		if ('iconClasses' in $$props) $$invalidate('iconClasses', iconClasses = $$props.iconClasses);
    		if ('fabClasses' in $$props) $$invalidate('fabClasses', fabClasses = $$props.fabClasses);
    		if ('smallClasses' in $$props) $$invalidate('smallClasses', smallClasses = $$props.smallClasses);
    		if ('disabledClasses' in $$props) $$invalidate('disabledClasses', disabledClasses = $$props.disabledClasses);
    		if ('elevationClasses' in $$props) $$invalidate('elevationClasses', elevationClasses = $$props.elevationClasses);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	let normal, lighter;

    	$$self.$$.update = ($$dirty = { light: 1, dark: 1, shade: 1, commonClasses: 1, normal: 1, lighter: 1, basicClasses: 1, elevationClasses: 1, outlinedClasses: 1, outlined: 1, textClasses: 1, text: 1, iconClasses: 1, icon: 1, fabClasses: 1, smallClasses: 1, small: 1, disabledClasses: 1, disabled: 1, removeClasses: 1, addClasses: 1 }) => {
    		if ($$dirty.light || $$dirty.dark || $$dirty.shade) { {
            $$invalidate('shade', shade = light ? 200 : 0);
            $$invalidate('shade', shade = dark ? -400 : shade);
          } }
    		if ($$dirty.shade) { $$invalidate('normal', normal = 500 - shade); }
    		if ($$dirty.shade) { $$invalidate('lighter', lighter = 400 - shade); }
    		if ($$dirty.commonClasses || $$dirty.normal || $$dirty.lighter || $$dirty.basicClasses || $$dirty.elevationClasses || $$dirty.outlinedClasses || $$dirty.outlined || $$dirty.textClasses || $$dirty.text || $$dirty.iconClasses || $$dirty.icon || $$dirty.fabClasses || $$dirty.smallClasses || $$dirty.small || $$dirty.disabledClasses || $$dirty.disabled || $$dirty.removeClasses || $$dirty.addClasses) { {
              $$invalidate('classes', classes = cb
                .flush()
                .add(commonClasses)
                .add(`${bg(normal)} hover:${bg(lighter)} ${basicClasses}`, basic)
                .add(elevationClasses, elevation)
                .add(`${border(lighter)} ${txt(normal)} ${ripple()} hover:${bg(50)} ${outlinedClasses}`, outlined)
                .add(`${ripple()} ${txt(lighter)} ${textClasses}`, text)
                .add(iconClasses, icon)
                .remove('py-2', icon)
                .add(`${ripple()} ${fabClasses}`, fab)
                .remove(`${txt(lighter)} ${ripple()}`, fab)
                .add(smallClasses, small)
                .add(disabledClasses, disabled)
                .remove(removeClasses)
                .add(addClasses)
                .get());
          } }
    	};

    	return {
    		c,
    		value,
    		outlined,
    		text,
    		block,
    		disabled,
    		icon,
    		small,
    		light,
    		dark,
    		flat,
    		color,
    		removeClasses,
    		addClasses,
    		commonClasses,
    		basicClasses,
    		outlinedClasses,
    		textClasses,
    		iconClasses,
    		fabClasses,
    		smallClasses,
    		disabledClasses,
    		elevationClasses,
    		basic,
    		classes,
    		txt,
    		click_handler,
    		click_handler_1,
    		$$slots,
    		$$scope
    	};
    }

    class Button extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$1, create_fragment$1, safe_not_equal$1, ["c", "value", "outlined", "text", "block", "disabled", "icon", "small", "light", "dark", "flat", "color", "removeClasses", "addClasses", "commonClasses", "basicClasses", "outlinedClasses", "textClasses", "iconClasses", "fabClasses", "smallClasses", "disabledClasses", "elevationClasses"]);
    	}

    	get c() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set c(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get outlined() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set outlined(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get block() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set block(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icon() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get small() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set small(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get light() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set light(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dark() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dark(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flat() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flat(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get removeClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set removeClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set addClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get commonClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set commonClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get basicClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basicClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get outlinedClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set outlinedClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get textClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set textClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get iconClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set iconClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fabClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fabClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get smallClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set smallClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabledClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabledClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get elevationClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set elevationClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* Users/mac/Sites/smelte/src/components/Util/Ripple.svelte generated by Svelte v3.6.6 */

    const file$2 = "Users/mac/Sites/smelte/src/components/Util/Ripple.svelte";

    function create_fragment$2(ctx) {
    	var span, span_class_value, current;

    	const default_slot_1 = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_1, ctx, null);

    	return {
    		c: function create() {
    			span = element$1("span");

    			if (default_slot) default_slot.c();

    			attr$1(span, "class", span_class_value = "z-40 p-2 rounded-full flex items-center justify-center top-0 left-0 ripple-" + ctx.color + " svelte-bdmrkm");
    			add_location$1(span, file$2, 10, 0, 500);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(span_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert$1(target, span, anchor);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
    			}

    			if ((!current || changed.color) && span_class_value !== (span_class_value = "z-40 p-2 rounded-full flex items-center justify-center top-0 left-0 ripple-" + ctx.color + " svelte-bdmrkm")) {
    				attr$1(span, "class", span_class_value);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out$1(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach$1(span);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { color = "primary" } = $$props;

    	const writable_props = ['color'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Ripple> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	return { color, $$slots, $$scope };
    }

    class Ripple extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$2, create_fragment$2, safe_not_equal$1, ["color"]);
    	}

    	get color() {
    		throw new Error("<Ripple>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Ripple>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const Ripple$1 = Ripple;

    /* Users/mac/Sites/smelte/src/components/Switch/Switch.svelte generated by Svelte v3.6.6 */

    const file$3 = "Users/mac/Sites/smelte/src/components/Switch/Switch.svelte";

    // (23:4) <Ripple color={value && !disabled ? color : 'gray'}>
    function create_default_slot$1(ctx) {
    	var div;

    	return {
    		c: function create() {
    			div = element$1("div");
    			attr$1(div, "class", "w-full h-full absolute");
    			add_location$1(div, file$3, 23, 6, 630);
    		},

    		m: function mount(target, anchor) {
    			insert$1(target, div, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach$1(div);
    			}
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	var div2, input, t0, div1, t1, div0, div0_style_value, t2, label_1, t3, current, dispose;

    	var ripple = new Ripple$1({
    		props: {
    		color: ctx.value && !ctx.disabled ? ctx.color : 'gray',
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			div2 = element$1("div");
    			input = element$1("input");
    			t0 = space$1();
    			div1 = element$1("div");
    			ripple.$$.fragment.c();
    			t1 = space$1();
    			div0 = element$1("div");
    			t2 = space$1();
    			label_1 = element$1("label");
    			t3 = text$1(ctx.label);
    			attr$1(input, "class", "hidden");
    			attr$1(input, "type", "checkbox");
    			add_location$1(input, file$3, 16, 2, 329);
    			attr$1(div0, "class", "rounded-full p-2 w-5 h-5 absolute elevation-3 transition-fast");
    			attr$1(div0, "style", div0_style_value = ctx.value ? 'left: 1.25rem' : '');
    			toggle_class(div0, "bg-white", !ctx.value);
    			toggle_class(div0, "bg-primary-400", ctx.value);
    			toggle_class(div0, "left-0", !ctx.value);
    			add_location$1(div0, file$3, 25, 4, 687);
    			attr$1(div1, "class", "relative w-10 h-auto z-0 rounded-full overflow-visible flex\n    items-center justify-center");
    			toggle_class(div1, "bg-gray-300", !ctx.value);
    			toggle_class(div1, "bg-primary-200", ctx.value);
    			add_location$1(div1, file$3, 17, 2, 393);
    			attr$1(label_1, "aria-hidden", "true");
    			attr$1(label_1, "class", "pl-2 cursor-pointer");
    			toggle_class(label_1, "text-gray-500", ctx.disabled);
    			toggle_class(label_1, "text-gray-700", !ctx.disabled);
    			add_location$1(label_1, file$3, 32, 2, 918);
    			attr$1(div2, "class", "inline-flex items-center mb-2 cursor-pointer z-10");
    			add_location$1(div2, file$3, 15, 0, 246);

    			dispose = [
    				listen(input, "change", ctx.input_change_handler),
    				listen(input, "change", ctx.change_handler),
    				listen(div2, "click", ctx.check)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert$1(target, div2, anchor);
    			append$1(div2, input);

    			input.value = ctx.value;

    			append$1(div2, t0);
    			append$1(div2, div1);
    			mount_component$1(ripple, div1, null);
    			append$1(div1, t1);
    			append$1(div1, div0);
    			append$1(div2, t2);
    			append$1(div2, label_1);
    			append$1(label_1, t3);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) input.value = ctx.value;

    			var ripple_changes = {};
    			if (changed.value || changed.disabled || changed.color) ripple_changes.color = ctx.value && !ctx.disabled ? ctx.color : 'gray';
    			if (changed.$$scope) ripple_changes.$$scope = { changed, ctx };
    			ripple.$set(ripple_changes);

    			if ((!current || changed.value) && div0_style_value !== (div0_style_value = ctx.value ? 'left: 1.25rem' : '')) {
    				attr$1(div0, "style", div0_style_value);
    			}

    			if (changed.value) {
    				toggle_class(div0, "bg-white", !ctx.value);
    				toggle_class(div0, "bg-primary-400", ctx.value);
    				toggle_class(div0, "left-0", !ctx.value);
    				toggle_class(div1, "bg-gray-300", !ctx.value);
    				toggle_class(div1, "bg-primary-200", ctx.value);
    			}

    			if (!current || changed.label) {
    				set_data$1(t3, ctx.label);
    			}

    			if (changed.disabled) {
    				toggle_class(label_1, "text-gray-500", ctx.disabled);
    				toggle_class(label_1, "text-gray-700", !ctx.disabled);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in$1(ripple.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out$1(ripple.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach$1(div2);
    			}

    			destroy_component$1(ripple, );

    			run_all$1(dispose);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { value = false, label = "", color = "primary", disabled = false } = $$props;

      function check() {
        if (disabled) return;

        $$invalidate('value', value = !value);
      }

    	const writable_props = ['value', 'label', 'color', 'disabled'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Switch> was created with unknown prop '${key}'`);
    	});

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function input_change_handler() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	$$self.$set = $$props => {
    		if ('value' in $$props) $$invalidate('value', value = $$props.value);
    		if ('label' in $$props) $$invalidate('label', label = $$props.label);
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$props.disabled);
    	};

    	return {
    		value,
    		label,
    		color,
    		disabled,
    		check,
    		change_handler,
    		input_change_handler
    	};
    }

    class Switch extends SvelteComponentDev$1 {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$3, create_fragment$3, safe_not_equal$1, ["value", "label", "color", "disabled"]);
    	}

    	get value() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.6.6 */

    const file$4 = "src/App.svelte";

    // (15:4) <Button>
    function create_default_slot$2(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Button");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	var div2, h1, t0, t1, t2, t3, h2, t4, t5, t6, t7, h3, t8, t9, t10, t11, h4, t12, t13, t14, t15, h5, t16, t17, t18, t19, h6, t20, t21, t22, t23, div0, t24, div1, current;

    	var button = new Button({
    		props: {
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var switch_1 = new Switch({
    		props: { label: "Switch" },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			div2 = element("div");
    			h1 = element("h1");
    			t0 = text("Hello ");
    			t1 = text(ctx.name);
    			t2 = text("!");
    			t3 = space();
    			h2 = element("h2");
    			t4 = text("Hello ");
    			t5 = text(ctx.name);
    			t6 = text("!");
    			t7 = space();
    			h3 = element("h3");
    			t8 = text("Hello ");
    			t9 = text(ctx.name);
    			t10 = text("!");
    			t11 = space();
    			h4 = element("h4");
    			t12 = text("Hello ");
    			t13 = text(ctx.name);
    			t14 = text("!");
    			t15 = space();
    			h5 = element("h5");
    			t16 = text("Hello ");
    			t17 = text(ctx.name);
    			t18 = text("!");
    			t19 = space();
    			h6 = element("h6");
    			t20 = text("Hello ");
    			t21 = text(ctx.name);
    			t22 = text("!");
    			t23 = space();
    			div0 = element("div");
    			button.$$.fragment.c();
    			t24 = space();
    			div1 = element("div");
    			switch_1.$$.fragment.c();
    			add_location(h1, file$4, 7, 2, 147);
    			add_location(h2, file$4, 8, 2, 172);
    			add_location(h3, file$4, 9, 2, 197);
    			add_location(h4, file$4, 10, 2, 222);
    			add_location(h5, file$4, 11, 2, 247);
    			add_location(h6, file$4, 12, 2, 272);
    			attr(div0, "class", "py-6");
    			add_location(div0, file$4, 13, 2, 297);
    			attr(div1, "class", "py-6");
    			add_location(div1, file$4, 16, 2, 355);
    			attr(div2, "class", "container mx-auto h-full items-center");
    			add_location(div2, file$4, 6, 0, 93);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, h1);
    			append(h1, t0);
    			append(h1, t1);
    			append(h1, t2);
    			append(div2, t3);
    			append(div2, h2);
    			append(h2, t4);
    			append(h2, t5);
    			append(h2, t6);
    			append(div2, t7);
    			append(div2, h3);
    			append(h3, t8);
    			append(h3, t9);
    			append(h3, t10);
    			append(div2, t11);
    			append(div2, h4);
    			append(h4, t12);
    			append(h4, t13);
    			append(h4, t14);
    			append(div2, t15);
    			append(div2, h5);
    			append(h5, t16);
    			append(h5, t17);
    			append(h5, t18);
    			append(div2, t19);
    			append(div2, h6);
    			append(h6, t20);
    			append(h6, t21);
    			append(h6, t22);
    			append(div2, t23);
    			append(div2, div0);
    			mount_component(button, div0, null);
    			append(div2, t24);
    			append(div2, div1);
    			mount_component(switch_1, div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.name) {
    				set_data(t1, ctx.name);
    				set_data(t5, ctx.name);
    				set_data(t9, ctx.name);
    				set_data(t13, ctx.name);
    				set_data(t17, ctx.name);
    				set_data(t21, ctx.name);
    			}

    			var button_changes = {};
    			if (changed.$$scope) button_changes.$$scope = { changed, ctx };
    			button.$set(button_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);

    			transition_in(switch_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			transition_out(switch_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div2);
    			}

    			destroy_component(button, );

    			destroy_component(switch_1, );
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { name } = $$props;

    	const writable_props = ['name'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    	};

    	return { name };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, ["name"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: 'world'
      }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
