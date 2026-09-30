export const MAX_IMAGE_FILE_SIZE = 1024 * 1024;

const supportedImageTypes = new Set(['image/jpeg', 'image/png']);

export function validateImageFile(file) {
    if (!file || !supportedImageTypes.has(file.type) || !Number.isFinite(file.size) || file.size <= 0) {
        throw new Error('請選擇有效的 JPG 或 PNG 圖片。');
    }
    if (file.size > MAX_IMAGE_FILE_SIZE) {
        throw new Error('原始圖片大小不可超過 1 MiB。');
    }
}

export function readImageFileAsDataUrl(file) {
    validateImageFile(file);

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('無法讀取圖片，請重試。'));
        }, { once: true });
        reader.addEventListener('error', () => reject(new Error('無法讀取圖片，請重試。')), { once: true });
        reader.readAsDataURL(file);
    });
}