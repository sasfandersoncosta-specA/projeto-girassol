module.exports = (sequelize, DataTypes) => {
    const DemandSearch = sequelize.define('DemandSearch', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        searchParams: {
            type: DataTypes.JSON,
            allowNull: false
        }
    });

    return DemandSearch;
};