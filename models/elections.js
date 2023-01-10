'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
     static associate(models) {
      // define association here
      election.belongsTo(models.admins, {
        foreignKey: "adminID",
      });

      election.hasMany(models.questions, {
        foreignKey: "electionID",
      });

      election.hasMany(models.voters, {
        foreignKey: "electionID",
      });
    }

    static AddElection({ name, adminID, url }) {
      return this.create({
        name,
        url,
        adminID,
      });
    }

    static LaunchElection(id) {
      return this.update(
        {
          launched: true,
        },
        {
          returning: true,
          where: {
            id,
          },
        }
      );
    }

    static GetElections(adminID) {
      return this.findAll({
        where: {
          adminID,
        },
        order: [["id", "ASC"]],
      });
    }

    static GetElection(id) {
      return this.findOne({
        where: {
          id,
        },
      });
    }

    static GetUrl(url) {
      return this.findOne({
        where: {
          url,
        },
      });
    }
    //static async end(id) {
      //return this.update(
        //{ ended: true },
        //{
          //where: {
            //id: id,
          //},

  }
  election.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
    },
  },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    launched: {
      type: DataTypes.BOOLEAN,
    },
    ended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  }, {
    sequelize,
    modelName: 'election',
  });
  return election;
};