// CategoryMember.js
module.exports = (sequelize, DataTypes) => {
  const CategoryMember = sequelize.define('CategoryMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ContactCategories',
        key: 'id'
      }
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      }
    }
  }, {
    tableName: 'CategoryMembers',
    timestamps: true
  });

  return CategoryMember;
};
