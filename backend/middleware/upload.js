const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configura o Cloudinary com as suas credenciais do .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuração de armazenamento para FOTOS DE PERFIL
const profilePhotoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'girassol/profile_photos',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
    },
});

// Configuração de armazenamento para DOCUMENTOS CRP
const crpDocumentStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'girassol/crp_documents',
        allowed_formats: ['jpg', 'png', 'pdf'],
    },
});

// Cria as instâncias do Multer para cada tipo de upload
const uploadProfilePhoto = multer({ storage: profilePhotoStorage });
const uploadCrpDocument = multer({ storage: crpDocumentStorage });

module.exports = {
    uploadProfilePhoto,
    uploadCrpDocument,
};