'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class voter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
     static associate(models) {
      // define association here
      voter.belongsTo(models.election, {
        foreignKey: "electionID",
      });
    }

    passwordreset(password) {
      return this.update({ password });
    }

    static async addVoter({ voterID, password, electionID }) {
      return await this.create({
        voterID,
        password,
        electionID,
        voted: false,
      });
    }

    static async VoterCount(electionID) {
      return await this.count({
        where: {
          electionID,
        },
      });
    }

    static async Voters(electionID) {
      return await this.findAll({
        where: {
          electionID,
        },
        order: [["id", "ASC"]],
      });
    }

    static async FindAVoter(id) {
      return await this.findOne({
        where: {
          id,
        },
      });
    }

    static async delete(id) {
      return await this.destroy({
        where: {
          id,
        },
      });
    }

  }
  voter.init({
    voterID: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    voted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, 
  {
    sequelize,
    modelName: 'voter',
  });
  return voter;
};