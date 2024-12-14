import guessFormat from 'moment-guess';
import tippy from 'tippy.js';


const tooltip = tippy(document.createElement('div'), {
    content: '',
    trigger: 'manual',
    placement: "right-end",
    theme: 'shams',
});

function devlog(...args) {
    if (process.env.NODE_ENV === 'development') {
        console.log(...args);
    }
}

function parseDate(dateStr, format) {
    const formatParts = format.split(/[^A-Za-z0-9]+/);
    const dateParts = dateStr.split(/[^A-Za-z0-9]+/);

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsShort = months.map(month => month.slice(0, 3));

    let day, month, year;

    formatParts.forEach((part, index) => {
        switch (part) {
            case 'YYYY':
                year = parseInt(dateParts[index], 10);
                break;
            case 'YY':
                year = parseInt('20' + dateParts[index], 10);
                break;
            case 'MM':
                month = parseInt(dateParts[index], 10) - 1;
                break;
            case 'MMM':
                month = monthsShort.indexOf(dateParts[index]);
                break;
            case 'MMMM':
                month = months.indexOf(dateParts[index]);
                break;
            case 'DD':
            case 'D':
                day = parseInt(dateParts[index], 10);
                break;
            default:
                return false;
        }
    });

    return new Date(year, month, day);
}

function toPersian(date, format) {
    const d = parseDate(date, format);
    devlog('d', d);
    return d && isFinite(d) && d.toLocaleDateString('fa-IR')
}


function addTooltipToSelectedText(doc, iframe) {
    const selection = doc.getSelection();
    const selectedText = selection.toString().trim();

    // 10 is max length for a date (YYYY/MM/DD)
    if (selectedText.length === 0) {
        return;
    }

    let guessedFormat;
    try {
        guessedFormat = guessFormat(selectedText);
        devlog('guessedFormat', guessedFormat);
        if (!guessedFormat) return;
    } catch {
        return;
    }

    const isArray = Array.isArray(guessedFormat);
    const notSure = isArray

    const pDate = toPersian(selectedText, isArray ? guessedFormat[0] : guessedFormat);
    devlog('pDate', pDate);
    if (!pDate) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    let adjustedRect;

    if (iframe) {
        const iframeRect = iframe.getBoundingClientRect();
        adjustedRect = {
            top: rect.top + iframeRect.top,
            left: rect.left + iframeRect.left,
            right: rect.right + iframeRect.left,
            bottom: rect.bottom + iframeRect.top,
            width: rect.width,
            height: rect.height,
        };
    }

    tooltip.setProps({
        getReferenceClientRect: () => adjustedRect || rect,
        content: (notSure ? '≈' : '') + pDate,
    });

    tooltip.show();

    doc.addEventListener('scroll', () => {
        tooltip.hide()
    }, {once: true});
    window.addEventListener('resize', () => {
        tooltip.hide()
    }, {once: true});
}


const TIMEOUT = 500;

// Listen for selection changes in the main document
let selectionTimeout;
document.addEventListener("selectionchange", () => {
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(addTooltipToSelectedText, TIMEOUT, document);
});

// Listen for selection changes in iframes
const iframes = document.querySelectorAll('iframe');
iframes.forEach(iframe => {
    iframe.onload = () => {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        let selectionTimeout;
        iframeDoc.addEventListener('selectionchange', () => {
            clearTimeout(selectionTimeout);
            selectionTimeout = setTimeout(addTooltipToSelectedText, TIMEOUT, iframeDoc, iframe);
        });
    };
});
