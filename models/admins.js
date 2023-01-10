'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
     static associate(models) {
      // define association here
      Admin.hasMany(models.electionModel, {
        foreignKey: "adminID",
      });
    }
    static createadmin({ name, email, password }) {
      return this.create({
        name,
        email,
        password,
      });
    }
    resetPassword(password) {
      return this.update({ password });
    }


  }
  Admin.init({
    name: DataTypes.STRING,
    password: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    sequelize,
    modelName: 'Admin',
  });
  return Admin;
};