import { memo } from "react";
import { getColumnAlignment } from "../../utils/cellValueUtils.js";

export const TableHeader = memo(function TableHeader({ columns }) {
  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <th
            key={column.id}
            className={`align-${getColumnAlignment(column)}`}
            style={{ width: column.width }}
            scope="col"
          >
            {column.title}
          </th>
        ))}
      </tr>
    </thead>
  );
});
