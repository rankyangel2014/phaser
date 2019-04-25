/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2019 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */

var Class = require('../../utils/Class');
var Components = require('../components');
var DOMElementRender = require('./DOMElementRender');
var GameObject = require('../GameObject');
var IsPlainObject = require('../../utils/object/IsPlainObject');
var RemoveFromDOM = require('../../dom/RemoveFromDOM');
var Vector4 = require('../../math/Vector4');

/**
 * @classdesc
 * [description]
 *
 * @class DOMElement
 * @extends Phaser.GameObjects.GameObject
 * @memberof Phaser.GameObjects
 * @constructor
 * @since 3.17.0
 *
 * @extends Phaser.GameObjects.Components.Alpha
 * @extends Phaser.GameObjects.Components.BlendMode
 * @extends Phaser.GameObjects.Components.ComputedSize
 * @extends Phaser.GameObjects.Components.Depth
 * @extends Phaser.GameObjects.Components.Origin
 * @extends Phaser.GameObjects.Components.ScrollFactor
 * @extends Phaser.GameObjects.Components.Transform
 * @extends Phaser.GameObjects.Components.Visible
 *
 * @param {Phaser.Scene} scene - The Scene to which this Game Object belongs. A Game Object can only belong to one Scene at a time.
 * @param {number} x - The horizontal position of this DOM Element in the world.
 * @param {number} y - The vertical position of this DOM Element in the world.
 * @param {(HTMLElement|string)} [element] - An existing DOM element, or a string. If a string starting with a # it will do a `getElementById` look-up on the string (minus the hash). Without a hash, it represents the type of element to create, i.e. 'div'.
 * @param {(string|any)} [style] - If a string, will be set directly as the elements `style` property value. If a plain object, will be iterated and the values transferred. In both cases the values replacing whatever CSS styles may have been previously set.
 * @param {string} [innerText] - If given, will be set directly as the elements `innerText` property value, replacing whatever was there before.
 */
var DOMElement = new Class({

    Extends: GameObject,

    Mixins: [
        Components.Alpha,
        Components.BlendMode,
        Components.ComputedSize,
        Components.Depth,
        Components.Origin,
        Components.ScrollFactor,
        Components.Transform,
        Components.Visible,
        DOMElementRender
    ],

    initialize:

    function DOMElement (scene, x, y, element, style, innerText)
    {
        GameObject.call(this, scene, 'DOMElement');

        this.parent = scene.sys.game.domContainer;

        this.cache = scene.sys.cache.html;

        this.node;

        this.transformOnly = false;

        this.skewX = 0;
        this.skewY = 0;

        //  https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/rotate3d
        this.rotate3d = new Vector4();
        this.rotate3dAngle = 'deg';

        this.handler = this.dispatchNativeEvent.bind(this);

        this.setPosition(x, y);

        if (typeof element === 'string')
        {
            //  hash?
            if (element[0] === '#')
            {
                this.setElement(element.substr(1), style, innerText);
            }
            else
            {
                this.createElement(element, style, innerText);
            }
        }
        else if (element)
        {
            this.setElement(element, style, innerText);
        }
    },

    setSkew: function (x, y)
    {
        if (x === undefined) { x = 0; }
        if (y === undefined) { y = x; }

        this.skewX = x;
        this.skewY = y;

        return this;
    },

    perspective: {

        get: function ()
        {
            return parseFloat(this.parent.style.perspective);
        },

        set: function (value)
        {
            this.parent.style.perspective = value + 'px';
        }

    },

    setPerspective: function (value)
    {
        //  Sets it on the DOM Container!
        this.parent.style.perspective = value + 'px';

        return this;
    },

    addListener: function (events)
    {
        if (this.node)
        {
            events = events.split(' ');

            for (var i = 0; i < events.length; i++)
            {
                this.node.addEventListener(events[i], this.handler, false);
            }
        }

        return this;
    },

    removeListener: function (events)
    {
        if (this.node)
        {
            events = events.split(' ');

            for (var i = 0; i < events.length; i++)
            {
                this.node.removeEventListener(events[i], this.handler);
            }
        }

        return this;
    },

    dispatchNativeEvent: function (event)
    {
        this.emit(event.type, event);
    },

    createElement: function (element, style, innerText)
    {
        return this.setElement(document.createElement(element), style, innerText);
    },

    setElement: function (element, style, innerText)
    {
        var target;

        if (typeof element === 'string')
        {
            target = document.getElementById(element);
        }
        else if (typeof element === 'object' && element.nodeType === 1)
        {
            target = element;
        }

        if (!target)
        {
            return;
        }

        this.node = target;

        //  style can be empty, a string or a plain object
        if (style && IsPlainObject(style))
        {
            for (var key in style)
            {
                target.style[key] = style[key];
            }
        }
        else if (typeof style === 'string')
        {
            target.style = style;
        }

        //  Add / Override the values we need

        target.style.zIndex = '0';
        target.style.display = 'inline';
        target.style.position = 'absolute';

        //  Node handler

        target.phaser = this;

        if (this.parent)
        {
            this.parent.appendChild(target);
        }

        //  InnerText

        if (innerText)
        {
            target.innerText = innerText;
        }

        var nodeBounds = target.getBoundingClientRect();

        this.setSize(nodeBounds.width || 0, nodeBounds.height || 0);

        return this;
    },

    createFromCache: function (key, elementType)
    {
        return this.createFromHTML(this.cache.get(key), elementType);
    },

    createFromHTML: function (html, elementType)
    {
        if (elementType === undefined) { elementType = 'div'; }

        var element = document.createElement(elementType);

        this.node = element;

        element.style.zIndex = '0';
        element.style.display = 'inline';
        element.style.position = 'absolute';

        //  Node handler

        element.phaser = this;

        if (this.parent)
        {
            this.parent.appendChild(element);
        }

        element.innerHTML = html;

        var nodeBounds = element.getBoundingClientRect();

        this.setSize(nodeBounds.width || 0, nodeBounds.height || 0);

        return this;
    },

    getChildByProperty: function (property, value)
    {
        if (this.node)
        {
            var children = this.node.querySelectorAll('*');

            for (var i = 0; i < children.length; i++)
            {
                if (children[i][property] === value)
                {
                    return children[i];
                }
            }
        }

        return null;
    },

    getChildByID: function (id)
    {
        return this.getChildByProperty('id', id);
    },

    getChildByName: function (name)
    {
        return this.getChildByProperty('name', name);
    },

    setClassName: function (className)
    {
        if (this.node)
        {
            this.node.className = className;

            var nodeBounds = this.node.getBoundingClientRect();

            this.setSize(nodeBounds.width, nodeBounds.height);
        }

        return this;
    },

    setText: function (text)
    {
        if (this.node)
        {
            this.node.innerText = text;

            var nodeBounds = this.node.getBoundingClientRect();

            this.setSize(nodeBounds.width, nodeBounds.height);
        }

        return this;
    },

    setHTML: function (html)
    {
        if (this.node)
        {
            this.node.innerHTML = html;

            var nodeBounds = this.node.getBoundingClientRect();

            this.setSize(nodeBounds.width, nodeBounds.height);
        }

        return this;
    },

    /**
     * Compares the renderMask with the renderFlags to see if this Game Object will render or not.
     * 
     * DOMElements always return `true` as they need to still set values during the render pass, even if not visible.
     *
     * @method Phaser.GameObjects.DOMElement#willRender
     * @since 3.12.0
     *
     * @return {boolean} True if the Game Object should be rendered, otherwise false.
     */
    willRender: function ()
    {
        return true;
    },

    destroy: function ()
    {
        RemoveFromDOM(this.node);
    }

});

module.exports = DOMElement;
