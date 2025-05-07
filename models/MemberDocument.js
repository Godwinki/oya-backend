// models/MemberDocument.js
module.exports = (sequelize, DataTypes) => {
  const MemberDocument = sequelize.define('MemberDocument', {
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      }
    },
    documentType: {
      type: DataTypes.STRING,
      allowNull: false,
      // Types: ID_COPY, PASSPORT_PHOTO, TAX_CERTIFICATE, RESIDENCE_PROOF, COLLATERAL, LOAN_APPLICATION, etc.
    },
    documentName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    uploadDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    description: {
      type: DataTypes.TEXT
    },
    category: {
      type: DataTypes.STRING,
      // Categories: REGISTRATION, LOAN, COLLATERAL, PERSONAL, OTHER
    },
    expiryDate: {
      type: DataTypes.DATEONLY
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,  // Make this nullable
    },
    verificationDate: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'MemberDocuments',
    timestamps: true,
  });

  // Define association in the associate method which will be called later
  MemberDocument.associate = (models) => {
    MemberDocument.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member'
    });
    
    // Only try to associate with User if the model exists
    if (models.User) {
      MemberDocument.belongsTo(models.User, {
        foreignKey: 'verifiedBy',
        as: 'verifier',
        constraints: false  // This will disable the foreign key constraint
      });
    }
  };

  return MemberDocument;
};
