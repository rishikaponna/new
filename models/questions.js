'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
     static associate(models) {
      // define association here
      question.belongsTo(models.electionModel, {
        foreignKey: "electionID",
      });

      question.hasMany(models.optionModel, {
        foreignKey: "questionID",
      });
    }
    
    static async GetQuestionCount(electionID) {
      return await this.count({
        where: {
          electionID,
        },
      });
    }

    static EditQuestion({ name, description, id }) {
      return this.update(
        {
          name,
          description,
        },
        {
          returning: true,
          where: {
            id,
          },
        }
      );
    }

    static add({ name, description, electionID }) {
      return this.create({
        name,
        description,
        electionID,
      });
    }

    static async GetQuestion(id) {
      return await this.findOne({
        where: {
          id,
        },
      });
    }

    static delete(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

    static async GetQuestions(electionID) {
      return await this.findAll({
        where: {
          electionID,
        },
        order: [["id", "ASC"]],
      });
    }

  }
  question.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'question',
  });
  return question;
};