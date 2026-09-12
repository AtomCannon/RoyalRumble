// Commentary feed (two idiots at a desk) + on-canvas popups.
window.P = window.P || {};
(function () {
  const U = P.util;
  const N = P.announcer = { el: null, lines: [], max: 60, who: 0 };
  N.attach = (el) => { N.el = el; N.el.innerHTML = ''; N.lines = []; };
  N.say = (text, opts = {}) => {
    if (!N.el) return;
    const c = P.data.COMMENTATORS[opts.who ?? (N.who = 1 - N.who)];
    const row = U.el('div', { class: 'cline' + (opts.big ? ' big' : '') + (opts.cls ? ' ' + opts.cls : '') }, [U.el('span', { class: 'cwho', style: `color:${c.color}`, text: opts.system ? '📣' : c.name.split(' ')[0] + ':' }), ' ', U.el('span', { text: text })]);
    N.el.prepend(row); N.lines.push(text);
    while (N.el.children.length > N.max) N.el.lastChild.remove();
  };
  N.fmt = (tpl, a, d, extra) => { const v = Object.assign({}, a ? P.char.vars(a, 'a') : {}, d ? P.char.vars(d, 'd') : {}, extra || {}); return U.fmt(U.pick([].concat(tpl)), v); };
})();
