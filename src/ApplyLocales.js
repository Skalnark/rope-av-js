import i18next from 'i18next';

export function applyLocales(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        try {
            const text = i18next.t(key);
            if (text) {
                el.innerText = text;
            }
        } catch (e) {}
    });

    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        try {
            const text = i18next.t(key);
            if (text && 'placeholder' in el) {
                el.placeholder = text;
            }
        } catch (e) {}
    });

    root.querySelectorAll('[data-i18n-value]').forEach((el) => {
        const key = el.getAttribute('data-i18n-value');
        try {
            const text = i18next.t(key);
            if (text && 'value' in el) {
                el.value = text;
            }
        } catch (e) {}
    });

    root.querySelectorAll('[data-i18n-href]').forEach((el) => {
        const key = el.getAttribute('data-i18n-href');
        try {
            const url = i18next.t(key);
            if (url && 'href' in el) {
                el.href = url;
            }
        } catch (e) {}
    });
}
