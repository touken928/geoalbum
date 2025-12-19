package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"geoalbum/backend/common"
	"geoalbum/backend/security"
)

type SecurityController struct {
	auditor *security.SQLInjectionAuditor
}

func NewSecurityController() *SecurityController {
	return &SecurityController{
		auditor: security.NewSQLInjectionAuditor(),
	}
}

// GetSecurityReport returns a security audit report (development only)
func (ctrl *SecurityController) GetSecurityReport(c *gin.Context) {
	// Only allow in development mode
	if gin.Mode() == gin.ReleaseMode {
		common.ForbiddenErrorResponse(c, "FORBIDDEN", "Security report not available in production")
		return
	}

	report := ctrl.auditor.GenerateSecurityReport()
	common.SuccessResponse(c, http.StatusOK, report)
}

// GetSecurityBestPractices returns implemented security best practices
func (ctrl *SecurityController) GetSecurityBestPractices(c *gin.Context) {
	// Only allow in development mode
	if gin.Mode() == gin.ReleaseMode {
		common.ForbiddenErrorResponse(c, "FORBIDDEN", "Security information not available in production")
		return
	}

	practices := ctrl.auditor.GetSecurityBestPractices()
	response := gin.H{
		"best_practices": practices,
		"parameterized_queries_verified": ctrl.auditor.VerifyParameterizedQueries(),
	}
	
	common.SuccessResponse(c, http.StatusOK, response)
}