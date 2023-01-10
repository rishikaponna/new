'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class option extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
     static associate(models) {
      // define association here
      option.belongsTo(models.question, {
        foreignKey: "questionID",
        onDelete: "CASCADE",
      });
    }
    static GetOptions(questionID) {
      return this.findAll({
        where: {
          questionID,
        },
        order: [["id", "ASC"]],
      });
    }

    static GetOption(id) {
      return this.findOne({
        where: {
          id,
        },
      });
    }

    static add({ value, questionID }) {
      return this.create({
        value,
        questionID,
      });
    }

    static edit({ value, id }) {
      return this.update(
        {
          value,
        },
        {
          where: {
            id,
          },
        }
      );
    }

    static delete(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

  }
  option.init({
    option: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: true,
      },
    }
  }, {
    sequelize,
    modelName: 'option',
  });
  return option;
};