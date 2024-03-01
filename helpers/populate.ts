if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
}
import { db } from '../models';
import { cleanDb } from '../helpers/testHelpers';
import fetch from 'node-fetch';

const populate = async () => {
  await cleanDb();
  console.log('Populating database...');

  const ships = await fetch('https://spacex-production.up.railway.app/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ ships { id name image class active } }' }),
  })
    .then(res => res.json())
    .then(data => data.data.ships);

  const dbData = await Promise.all(
    ships.map((ship: any) => {
      return db.Ship.create({
        active: ship.active,
        name: ship.name,
        class: ship.class,
        image: ship.image,
      });
    }),
  );

  const missions: Promise<any>[] = [];

  ships.forEach((ship: any, ind: number) => {
    if (ship.missions) {
      ship.missions.forEach(mission => {
        missions.push(
          db.Mission.create({
            flight: mission.flight,
            name: mission.name,
            shipId: dbData[ind].id,
          }),
        );
      });
    }
  });

  await Promise.all(missions);

  await db.sequelize.close();
};

if (require.main === module) {
  populate();
}

export { populate };
