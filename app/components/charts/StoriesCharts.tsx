import AgeDistributionChart from "./AgeDistributionChart";
import YearDistributionChart from "./YearDistributionChart";

      <Card className="mb-8 overflow-hidden">
        <div className="flex flex-row justify-start bg-gray-100">
          <div className="cursor-pointer bg-white p-6">
            <div className="font-semibold">
              Age Distribution
            </div>
          </div>
                    <div className="cursor-pointer  p-6">
            <div className="font-semibold">
              Year Distribution
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          
          <AgeDistributionChart
            className="shadow-lg"
            minAge={
              typeof resolvedSearchParams.minAge === "string"
                ? parseInt(resolvedSearchParams.minAge)
                : 10
            }
            maxAge={
              typeof resolvedSearchParams.maxAge === "string"
                ? parseInt(resolvedSearchParams.maxAge)
                : 40
            }
          />
                    <YearDistributionChart
            className="shadow-lg"
            minAge={
              typeof resolvedSearchParams.minAge === "string"
                ? parseInt(resolvedSearchParams.minAge)
                : 10
            }
            maxAge={
              typeof resolvedSearchParams.maxAge === "string"
                ? parseInt(resolvedSearchParams.maxAge)
                : 40
            }
          />
        </CardContent>
      </Card>