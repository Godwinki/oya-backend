// Member.js
module.exports = (sequelize, DataTypes) => {
  const Member = sequelize.define('Member', {
    // Core personal info
    nin: { type: DataTypes.STRING, allowNull: false, unique: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    idNo: { type: DataTypes.STRING, allowNull: false },
    placeOfBirth: { type: DataTypes.STRING },
    dateOfBirth: { type: DataTypes.DATEONLY },
    nationality: { type: DataTypes.STRING, defaultValue: 'Tanzanian' },
    region: { type: DataTypes.STRING, defaultValue: 'Arusha' },
    district: { type: DataTypes.STRING },
    ward: { type: DataTypes.STRING },
    village: { type: DataTypes.STRING },
    residence: { type: DataTypes.STRING },
    mobile: { type: DataTypes.STRING },
    pobox: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    maritalStatus: { type: DataTypes.STRING },
    // Employment & Financial
    employmentStatus: { type: DataTypes.STRING },
    employerName: { type: DataTypes.STRING },
    incomeBracket: { type: DataTypes.STRING },
    tin: { type: DataTypes.STRING },
    // Account info
    accountNumber: { type: DataTypes.STRING, allowNull: true }, // Manually added for now
    // Misc
    incomeSource: { type: DataTypes.STRING },
    businessType: { type: DataTypes.STRING },
    partners: { type: DataTypes.STRING },
    owners: { type: DataTypes.STRING },
    knowHow: { type: DataTypes.STRING },
    knowHowDetail: { type: DataTypes.STRING },
    otherSaccos: { type: DataTypes.STRING },
    declaration: { type: DataTypes.BOOLEAN, defaultValue: false },
    // Document uploads (store file paths)
    idCopyPath: { type: DataTypes.STRING },
    passportPhotoPath: { type: DataTypes.STRING },
    coverLetterPath: { type: DataTypes.STRING },
  }, {
    tableName: 'Members',
    timestamps: true,
  });

  // Define associations
  Member.associate = (models) => {
    // Each member can have many documents
    Member.hasMany(models.MemberDocument, {
      foreignKey: 'memberId',
      as: 'documents'
    });
    
    // Each member can have many accounts
    Member.hasMany(models.MemberAccount, {
      foreignKey: 'memberId',
      as: 'accounts'
    });

    // Each member can have many beneficiaries
    Member.hasMany(models.Beneficiary, {
      foreignKey: 'memberId',
      as: 'beneficiaries'
    });

    // Each member can have many emergency contacts
    Member.hasMany(models.EmergencyContact, {
      foreignKey: 'memberId',
      as: 'emergencyContacts'
    });
    
    // Many-to-many relationship with ContactCategories for SMS messaging
    Member.belongsToMany(models.ContactCategory, {
      through: 'CategoryMembers',
      foreignKey: 'memberId',
      otherKey: 'categoryId',
      as: 'contactCategories'
    });
  };

  return Member;
};
