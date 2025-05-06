// ContactCategory.js
module.exports = (sequelize, DataTypes) => {
  const ContactCategory = sequelize.define('ContactCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    description: { 
      type: DataTypes.TEXT
    },
    color: { 
      type: DataTypes.STRING, 
      allowNull: false,
      defaultValue: 'bg-blue-500'
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'ContactCategories',
    timestamps: true,
  });

  ContactCategory.associate = (models) => {
    // Each category is created by a user
    ContactCategory.belongsTo(models.User, {
      foreignKey: 'createdById',
      as: 'creator'
    });

    // Many-to-many relationship with Members
    ContactCategory.belongsToMany(models.Member, {
      through: 'CategoryMembers',
      foreignKey: 'categoryId',
      otherKey: 'memberId',
      as: 'members'
    });
  };

  return ContactCategory;
};
