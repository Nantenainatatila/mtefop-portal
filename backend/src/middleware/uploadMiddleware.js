
const multer = require("multer");
const path = require("path");
const fs = require("fs");


/*
==========================================
DOSSIER DE STOCKAGE DES APPLICATIONS
==========================================
*/

const uploadDir = path.join(
    __dirname,
    "../../uploads/applications"
);


/*
==========================================
CRÉER LE DOSSIER S'IL N'EXISTE PAS
==========================================
*/

if (!fs.existsSync(uploadDir)) {

    fs.mkdirSync(
        uploadDir,
        {
            recursive: true
        }
    );

}


/*
==========================================
CONFIGURATION DU STOCKAGE
==========================================
*/

const stockage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            uploadDir
        );

    },


    filename: (req, file, cb) => {

        const extension =
            path.extname(
                file.originalname
            );


        const nomOriginal =
            path
                .basename(
                    file.originalname,
                    extension
                )
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                );


        const nomFichier =
            `${Date.now()}-${nomOriginal}${extension}`;


        cb(
            null,
            nomFichier
        );

    }

});


/*
==========================================
VÉRIFICATION DES FICHIERS
==========================================
*/

const fileFilter = (req, file, cb) => {

    const extension =
        path
            .extname(
                file.originalname
            )
            .toLowerCase();


    /*
    ======================================
    FICHIER ZIP DE L'APPLICATION
    ======================================
    */

    if (
        file.fieldname === "fichier_app"
    ) {

        if (
            extension === ".zip"
        ) {

            return cb(
                null,
                true
            );

        }


        return cb(
            new Error(
                "Le fichier de l'application doit être au format ZIP."
            ),
            false
        );

    }


    /*
    ======================================
    ICÔNE DE L'APPLICATION
    ======================================
    */

    if (
        file.fieldname === "icone_app"
    ) {

        const extensionsImages = [
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            ".svg"
        ];


        if (
            extensionsImages.includes(
                extension
            )
        ) {

            return cb(
                null,
                true
            );

        }


        return cb(
            new Error(
                "L'icône doit être une image JPG, PNG, JPEG, WEBP ou SVG."
            ),
            false
        );

    }


    /*
    ======================================
    CHAMP DE FICHIER NON AUTORISÉ
    ======================================
    */

    return cb(
        new Error(
            "Type de fichier non autorisé."
        ),
        false
    );

};


/*
==========================================
CONFIGURATION MULTER
==========================================
*/

const upload = multer({

    storage: stockage,

    fileFilter: fileFilter,

    limits: {
        fileSize:
            100 * 1024 * 1024
    }

});


module.exports = upload;

