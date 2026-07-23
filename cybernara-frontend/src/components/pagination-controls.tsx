import Link from "next/link";
import type { SearchParamsRecord } from "../lib/listing";
import { pageHref } from "../lib/listing";

export function PaginationControls({
  pathname,
  params,
  prefix,
  limit,
  offset,
  itemCount
}: {
  pathname: string;
  params: SearchParamsRecord;
  prefix: string;
  limit: number;
  offset: number;
  itemCount: number;
}) {
  const hasPrevious = offset > 0;
  const hasNext = itemCount >= limit;

  return (
    <nav className="pagination" aria-label={`${prefix} pagination`}>
      <span>
        Showing {itemCount} rows from offset {offset}
      </span>
      <div>
        {hasPrevious ? <Link href={pageHref(pathname, params, prefix, offset - limit)}>Previous</Link> : <span>Previous</span>}
        {hasNext ? <Link href={pageHref(pathname, params, prefix, offset + limit)}>Next</Link> : <span>Next</span>}
      </div>
    </nav>
  );
}
