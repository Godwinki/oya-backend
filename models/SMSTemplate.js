// SMSTemplate.js
module.exports = (sequelize, DataTypes) => {
  const SMSTemplate = sequelize.define('SMSTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    content: { 
      type: DataTypes.TEXT, 
      allowNull: false 
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'SMSTemplates',
    timestamps: true,
  });

  SMSTemplate.associate = (models) => {
    // Each template is created by a user
    SMSTemplate.belongsTo(models.User, {
      foreignKey: 'createdById',
      as: 'creator'
    });
  };

  return SMSTemplate;
};
