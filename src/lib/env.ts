/**
 * Super ERP - Environment Configuration & Validation
 * Ensures required environment variables are set before the application starts.
 */

export const validateEnv = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const missing: string[] = [];

    const required = [
        'JWT_SECRET',
        'GOOGLE_CLIENT_ID'
    ];

    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        console.error('❌ FATAL: Gerekli çevre değişkenleri eksik:');
        missing.forEach(m => console.error(`   - ${m}`));
        
        if (isProduction) {
            console.error('Uygulama güvenlik risklerini önlemek için kapatılıyor.');
            process.exit(1);
        } else {
            console.warn('⚠️ Geliştirme modunda eksik değişkenler hatalara yol açabilir. Lütfen .env dosyasını yapılandırın.');
        }
    }
};

/** Tip güvenli erişim için kısayol */
export const env = {
    JWT_SECRET: process.env.JWT_SECRET as string,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_PATH: process.env.DATABASE_PATH || './data/erp.db'
};
