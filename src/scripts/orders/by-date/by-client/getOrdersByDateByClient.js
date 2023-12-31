import { WriteFile } from "../../../../lib/write-file.js";
import moment from "moment";

export async function getOrdersByDateByClient({ db, druidHelper }) {
  const clientsMap = await _getClientsMap({ db });

  const clientIds = [...clientsMap.keys()];
  const query = _getDruidQueryByClientIds({ clientIds });

  const druidRes = await druidHelper.fetchResultsSQL(query);

  for (const row of druidRes) {
    const { clientId, ...rawOrder } = row;
    const { createdAtTs, ...order } = rawOrder;

    // Format dates coming from druid.
    const createdAt = mome;

    function _getDruidQueryByClientIds({ clientIds }) {
      const clientIdsString = druidHelper.getArrayAsString(clientIds);
      return {
        query: `
            SELECT clientId, createdAtTs, orderCode, orderNumericId
            FROM "OrdersSales"
            WHERE status ='Completed'
            AND __time >= '2023-10-13' AND __time <= '2023-11-12'
            AND testClient !='true'
            AND clientId IN (${clientIdsString})
`,
      };
    }

    nt.unix(createdAtTs);
    const formattedDate = createdAt.format("YYYY-MM-DD");
    order.createdAt = formattedDate;

    const el = clientsMap.get(clientId);

    // Data from druid might not exist in mongo due to data sync issues.
    if (!el) continue;

    el.orders.push(order);
  }

  const data = [...clientsMap.values()];
  const flattenedData = data.flatMap(({ clientName, orders }) =>
    orders.map((order) => ({ clientName, ...order })),
  );
  flattenedData.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  WriteFile.CSV(flattenedData, "2023_11_22_orders-by-date-by-client_2.csv");

  return flattenedData.length;
}

async function _getClientsMap({ db }) {
  const clientsRes = await db
    .collection("Clients")
    .aggregate([
      {
        $match: {
          name: "Fresh Sandouk - Ras Al Khor",
        },
      },
      { $project: { name: 1 } },
    ])
    .toArray();

  const map = new Map();

  for (const client of clientsRes) {
    map.set(client._id, { clientName: client.name, orders: [] });
  }

  return map;
}
