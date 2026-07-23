import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RootStatusService } from "./root-status.service.js";

@ApiTags("Root")
@Controller()
export class RootController {
  constructor(@Inject(RootStatusService) private readonly rootStatus: RootStatusService) {}

  @Get()
  @ApiOperation({ summary: "Show backend liveness and route inventory metadata." })
  @ApiOkResponse({ description: "Backend landing status." })
  status() {
    return this.rootStatus.getStatus();
  }
}
