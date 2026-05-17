import { memo } from "react";
import { getColumnAlignment } from "../../utils/cellValueUtils.js";

/*
 * Sticky header row. memo because the columns array only changes when the
 * user shows or hides a column.
 */
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
